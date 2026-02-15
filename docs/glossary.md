# Glossary

| Term | Definition |
|------|-----------|
| **Command** | A user-initiated action triggered by typing `/name` in the chat input. Commands are registered on the backend, discovered by the frontend via SSE, and intercepted before the LLM. They may create jobs or publish events as side effects. |
| **Command Registry** | The backend service that holds all registered command definitions. Supports `register`, `resolve`, and `list` operations. Located at `api/src/slash/registry.ts`. |
| **Event** | A fact about something that happened, delivered from backend to frontend via the SSE stream. Events are the only mechanism for pushing state changes to the client. Follows the envelope format: `{ id, channel, type, payload, sentAt }`. |
| **Event Bus** | The publish/subscribe layer that persists events to MongoDB with monotonic `seq` IDs, then fans out to active SSE connections. Located at `api/src/events/bus.ts`. |
| **Job** | An async unit of work created by a command handler or an LLM tool call. Jobs are source-agnostic — the system doesn't care what created them, only that they need processing. _(Not yet implemented.)_ |
| **State Snapshot** | Startup events sent immediately when an SSE connection opens to hydrate client-visible state (currently `commands.snapshot` and `metrics.upsert`). State snapshots are regenerated fresh on each connection and are not replayed from storage. |
| **Event Cursor** | The `events.cursor` startup event that sets the reconnect boundary. It is emitted with SSE `id` equal to the current `seq` before snapshots are sent. |
| **Slash Command** | Synonym for command. The `/` prefix distinguishes commands from normal chat messages. |
| **Worker** | A background process that polls for pending jobs and executes them independently of the HTTP request lifecycle. _(Not yet implemented.)_ |
