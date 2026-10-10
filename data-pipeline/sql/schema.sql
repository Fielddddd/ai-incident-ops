-- Database setup for the incident knowledge base (Supabase / Postgres).
-- Run once in the Supabase dashboard: SQL Editor -> paste this file -> Run.
-- Safe to run again: everything is created only if it does not exist yet.

-- 1. Turn on vector support (pgvector).
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. One row per post-mortem: its text and a vector that represents its meaning.
--    The 768 must match `outputDimensionality` in ingest.ts and rag.service.ts
--    (model: gemini-embedding-2-preview). If you change one, change them all and re-ingest.
CREATE TABLE IF NOT EXISTS incident_documents (
  id BIGSERIAL PRIMARY KEY,
  file_name TEXT,
  content TEXT,
  embedding VECTOR(768)
);

-- 3. Finds the documents closest in meaning to a query vector.
--    `<=>` is cosine distance (smaller = more similar); 1 - distance gives a similarity
--    where bigger is better. The backend calls this through supabase.rpc().
CREATE OR REPLACE FUNCTION match_incident_documents (
  query_embedding VECTOR(768),
  match_count INT DEFAULT 3
) RETURNS TABLE (
  id BIGINT,
  file_name TEXT,
  content TEXT,
  similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    incident_documents.id,
    incident_documents.file_name,
    incident_documents.content,
    1 - (incident_documents.embedding <=> query_embedding) AS similarity
  FROM incident_documents
  ORDER BY incident_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Lock the table down. The backend and ingest script use the service role key, which
--    ignores row level security, so they keep working; the public (anon) key gets no access.
ALTER TABLE incident_documents ENABLE ROW LEVEL SECURITY;

-- Optional, only worth it once there are thousands of documents (not needed for a handful):
-- CREATE INDEX IF NOT EXISTS incident_documents_embedding_idx
--   ON incident_documents USING hnsw (embedding vector_cosine_ops);
