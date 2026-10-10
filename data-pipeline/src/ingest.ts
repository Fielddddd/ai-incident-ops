import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

const KB_DIR = path.resolve(import.meta.dirname, "../knowledge-base");
const TABLE = "incident_documents";

// Safe to run any number of times:
//  - a file whose content has not changed is skipped (no embedding call, no write)
//  - a changed or new file is embedded, inserted, and only then are its older rows removed,
//    so a failure half-way never leaves a file missing from the knowledge base
//  - rows of files that no longer exist are only deleted when run with --prune
async function ingestIncidentDocs() {
  if (!fs.existsSync(KB_DIR)) {
    console.error(`Directory ${KB_DIR} not found.`);
    process.exitCode = 1;
    return;
  }

  const prune = process.argv.includes("--prune");
  const files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith(".md"));
  const stats = { added: 0, updated: 0, unchanged: 0, failed: 0, pruned: 0 };

  for (const file of files) {
    const content = fs.readFileSync(path.join(KB_DIR, file), "utf8");

    try {
      const { data: existing, error: readError } = await supabase
        .from(TABLE)
        .select("id, content")
        .eq("file_name", file);
      if (readError) throw new Error(`Could not read existing rows: ${readError.message}`);

      if (existing.length === 1 && existing[0]!.content === content) {
        console.log(`Unchanged, skipped: ${file}`);
        stats.unchanged++;
        continue;
      }

      console.log(`Generating embedding for: ${file}...`);
      const embeddingResponse = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: content,
        config: { outputDimensionality: 768 },
      });
      const embedding = embeddingResponse.embeddings?.[0]?.values;
      if (!embedding) throw new Error("No embedding values returned");

      const { data: inserted, error: insertError } = await supabase
        .from(TABLE)
        .insert({ file_name: file, content, embedding })
        .select("id")
        .single();
      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

      // The new row is saved; now drop the older version(s) of the same file.
      if (existing.length > 0) {
        const { error: deleteError } = await supabase
          .from(TABLE)
          .delete()
          .eq("file_name", file)
          .neq("id", inserted.id);
        if (deleteError) throw new Error(`Could not remove old rows: ${deleteError.message}`);
        stats.updated++;
        console.log(`Updated: ${file}`);
      } else {
        stats.added++;
        console.log(`Added: ${file}`);
      }
    } catch (err) {
      stats.failed++;
      console.error(`Error processing ${file}:`, err instanceof Error ? err.message : err);
    }
  }

  if (prune) {
    const { data: rows, error } = await supabase.from(TABLE).select("id, file_name");
    if (error) {
      console.error(`Could not list rows to prune: ${error.message}`);
      stats.failed++;
    } else {
      const stale = rows.filter((r) => !files.includes(r.file_name));
      for (const row of stale) {
        const { error: deleteError } = await supabase.from(TABLE).delete().eq("id", row.id);
        if (deleteError) {
          stats.failed++;
          console.error(`Could not prune ${row.file_name}: ${deleteError.message}`);
        } else {
          stats.pruned++;
          console.log(`Pruned (file no longer exists): ${row.file_name}`);
        }
      }
    }
  }

  console.log(
    `Done. added=${stats.added} updated=${stats.updated} unchanged=${stats.unchanged} pruned=${stats.pruned} failed=${stats.failed}`,
  );
  if (stats.failed > 0) process.exitCode = 1;
}

ingestIncidentDocs();
