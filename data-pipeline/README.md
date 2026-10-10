# Data pipeline

Loads the post-mortems in `knowledge-base/` into Supabase so the backend can search them, plus two
scripts for trying the search and the agent from the terminal.

## Setup

1. **Create the table and search function** (once): open your Supabase project, go to
   *SQL Editor*, paste [`sql/schema.sql`](sql/schema.sql) and run it.
2. Copy `.env.example` to `.env` and fill in `GEMINI_API_KEY`, `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`.
3. `bun install`
4. `bun run ingest`

## Scripts

| Command | What it does |
|---|---|
| `bun run ingest` | Embeds each `.md` file and stores it. Safe to run again: unchanged files are skipped, edited files are replaced. |
| `bun run ingest -- --prune` | Same, and also removes rows whose file no longer exists. |
| `bun run query` | Asks one fixed question and prints the answer with its sources. |
| `bun run agent` | Runs one fixed request through the tool-calling agent. |

Run `ingest` again after adding or editing a file in `knowledge-base/`. The backend reads the
database, so it does not need a restart.

## Adding a post-mortem

Add a `.md` file to `knowledge-base/`, for example with a title, the affected service, a short
summary, the root cause and the fix, then run `bun run ingest`.
