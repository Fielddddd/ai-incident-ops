# Backend

NestJS 12 API for the incident assistant: searches past post-mortems (RAG) and runs a tool-calling
agent, both with streaming replies. Written as an ES module project (`"type": "module"`), laid out
like the official `nest new` template.

## Run

```bash
cp .env.example .env     # GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
pnpm install
pnpm run start:dev       # watch mode on http://localhost:3001 (set PORT to change)
```

Needs Node 22.12+ and pnpm. The database table and search function must exist in Supabase first
(see `../data-pipeline`), and the knowledge base must be loaded with its `ingest` script.

## Endpoints

| Method | Path | Body | Reply |
|---|---|---|---|
| `POST` | `/rag/ask` | `{ question, history? }` | `{ answer, sources }` |
| `POST` | `/rag/ask/stream` | same | NDJSON: `sources`, `delta`..., `done` |
| `POST` | `/agent/run` | `{ prompt, history? }` | `{ answer, toolCalls, truncated }` |
| `POST` | `/agent/run/stream` | same | NDJSON: `tool`..., `delta`..., `done` |
| `GET` | `/incidents/health` | | `{ status: "ok" }` |

`history` is up to 10 earlier `{ role: "user" | "assistant", content }` messages. Unknown fields are
rejected with `400`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm run start:dev` | compile and restart on every change |
| `pnpm run build` / `start:prod` | compile to `dist/`, run with `node dist/main` |
| `pnpm test` / `test:watch` / `test:cov` | Vitest (calls to Gemini and Supabase are faked) |
| `pnpm run lint` / `lint:fix` | ESLint |
| `pnpm run format` / `format:check` | Prettier |
| `pnpm run typecheck` | `tsc --noEmit` |

## Structure

```
src/
├── main.ts          start-up, global validation
├── app.module.ts
├── rag/             search + answer from post-mortems
├── agent/           tool-calling loop, simulated service metrics
├── incident/        health check
├── supabase/        Supabase client provider
├── gemini/          Gemini client provider
└── common/          streaming helper, retry, reply language, request DTOs
```

In an ES module project every relative import ends in `.js` (for example
`from "./rag.service.js"`), even though the files are `.ts`.
