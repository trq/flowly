# Flowly

Chat-driven personal finance app. All interaction happens through a conversational interface — the UI updates in response to events streamed from the backend.

## Project Structure

- `web/` - React + Vite SPA
- `api/` - Bun HTTP server

## Requirements

- [Bun](https://bun.sh/) 1.3.5+

## Quick Start

```sh
bun install
bun run dev        # starts both web and api
```

## Workspace Commands

Run these from the project root:

- `bun install` - Install dependencies
- `bun run dev` - Start all packages in dev/watch mode
- `bun run dev:web` - Start only the web app
- `bun run dev:api` - Start only the API
- `bun run build` - Build all workspaces
- `bun run test` - Run all tests (api + web)

## Documentation

- [Chat-Driven UI Architecture](docs/chat-driven-ui-architecture.md) — high-level system shape
- [Commands, Jobs & Events](docs/commands-jobs-events.md) — core concepts and how they evolve
- [Slash Commands](docs/slash-commands.md) — command registry, autocomplete, adding new commands
- [Glossary](docs/glossary.md) — terminology reference
