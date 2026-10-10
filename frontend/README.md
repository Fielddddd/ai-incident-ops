# Frontend

Chat interface for the incident assistant. Built with Next.js (App Router), React, Tailwind CSS and
[next-intl](https://next-intl.dev). It talks to the NestJS API in `../backend`.

## Run

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, default http://localhost:3001
bun install
bun run dev                  # http://localhost:3000  (redirects to /th or /en)
```

The backend must be running for answers to work (`cd ../backend && bun run dev`).

## What it does

- **Two modes** in the message box: search past post-mortems, or let the agent check service
  health first and then look up post-mortems.
- **Streaming**: the answer appears as it is written. In agent mode each tool call is shown as it
  happens.
- **Conversation memory** while the page is open: follow-up questions keep their context.
  Chats are not saved; closing the page clears them.
- **Thai and English** UI, chosen by the URL (`/th`, `/en`) with a toggle in the header. The answer
  language follows the language of the question.

## Structure

```
messages/               UI text, one JSON file per language (th.json, en.json)
src/
├── app/[locale]/       the page and layout (language comes from the URL)
├── components/
│   ├── chat/           Chat, Composer, Message, Sources, TraceRail
│   ├── layout/         Header, BackendStatus, LanguageToggle
│   └── ui/             Icons
├── hooks/useChat.ts    chat state, streaming, regenerate, new chat
├── i18n/               routing, request config, typed message keys
├── lib/                api client (streaming), history builder, shared types
└── proxy.ts            redirects "/" to the right language
```

`src/i18n/messages-parity.ts` fails type-checking if `th.json` and `en.json` stop having the same
keys.

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | development server |
| `bun run build` / `bun run start` | production build and server |
| `bunx tsc --noEmit` | type-check |
