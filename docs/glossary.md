# Glossary

| Term | Definition |
|------|-----------|
| **Command** | A user-initiated action triggered by typing `/name` in the chat input. Commands are registered on the backend, discovered by the frontend via SSE, and intercepted before the LLM. They may create jobs or publish events as side effects. |
| **Command Registry** | The backend service that holds all registered command definitions. Supports `register`, `resolve`, and `list` operations. Located at `api/src/commands/registry.ts`. |
| **Event** | A fact about something that happened, delivered from backend to frontend via the SSE stream. Events are the only mechanism for pushing state changes to the client. Follows the envelope format: `{ id, channel, type, payload, sentAt }`. |
| **Event Bus** | The in-memory pub/sub system that fans out events to active SSE connections. Located at `api/src/events/bus.ts`. |
| **Job** | An async unit of work created by a command handler or an LLM tool call. Jobs are source-agnostic — the system doesn't care what created them, only that they need processing. _(Not yet implemented.)_ |
| **State Snapshot** | An event sent immediately when an SSE connection opens to hydrate the client with current state. Follows the pattern `{channel}.snapshot` (e.g. `commands.snapshot`, `metrics.snapshot`). State snapshots are regenerated fresh on each connection, not replayed from storage. |
| **Slash Command** | Synonym for command. The `/` prefix distinguishes commands from normal chat messages. |
| **Worker** | A background process that polls for pending jobs and executes them independently of the HTTP request lifecycle. _(Not yet implemented.)_ |
