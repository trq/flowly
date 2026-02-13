# Flowly

Chat-driven personal finance app. Bun monorepo: `web/` (React + Vite) and `api/` (Bun HTTP server).

## Documentation

Read the docs before making architectural decisions:

- `docs/chat-driven-ui-architecture.md` — system shape, endpoint responsibilities, event contract
- `docs/commands-jobs-events.md` — commands vs jobs vs events, current and target architecture
- `docs/slash-commands.md` — command registry, adding new commands, autocomplete
- `docs/glossary.md` — terminology (command, job, event, state snapshot, etc.)

## Working Guidelines

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- Minimum code that solves the problem. No speculative features or abstractions.
- Touch only what you must. Match existing style. Don't "improve" adjacent code.
- Remove imports/variables/functions that your changes made unused. Don't remove pre-existing dead code unless asked.

## Conventions

- **IDs**: Always UUID strings
- **Naming**: "Command" = user-initiated slash command. "Job" = async unit of work (any source). "Event" = fact delivered via SSE.
- **Package manager**: Bun (`bun install`, `bun run`, `bun test`)
- **Tests**: `bun:test` for api, Vitest + testing-library for web. Tests live in `{package}/tests/` mirroring `{package}/src/`
- **No ORM**: Direct MongoDB collection access (when DB is introduced)
- **Module-level state**: The project uses module-level state for singletons (event bus, command registry). Follow this pattern.
- **Event envelope**: `{ id, channel, type, payload, sentAt }` — see architecture doc for full contract

## Commands

- `bun run dev` — start all packages
- `bun run test` — run all tests
- `bun run build` — build all packages
