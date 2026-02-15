# Plan: Durable Event Bus with MongoDB + SSE Replay

## Context

The in-memory event bus is fire-and-forget. If a client's SSE connection drops and reconnects, events published during the gap are lost. This makes action events like `session.logout` unreliable. Since a database is needed soon anyway, we introduce MongoDB now and use it to persist bus events, enabling SSE replay via the standard `Last-Event-ID` mechanism.

## Architecture

```
publish(event)
  → assign seq via atomic counter in MongoDB
  → insert into `events` collection
  → fan out to in-memory subscribers (with seq attached)

GET /events (reconnect with Last-Event-ID: N)
  → send snapshot events (metrics, commands) — NOT from DB, no SSE id
  → subscribe to live bus FIRST (buffer events)
  → query DB for events with seq > N, replay them
  → flush buffer (dedup by seq)
  → switch to direct streaming
```

The in-memory pub/sub stays for real-time fan-out. MongoDB provides the replay capability.

## Changes

### 1. Add `mongodb` dependency — `api/package.json`

Add `"mongodb": "^6"` to dependencies. Run `bun install`.

### 2. Add `MONGO_URI` to config — `api/src/config/env.ts`

Add `MONGO_URI` field with default `mongodb://localhost:27017/flowly` for dev convenience.

### 3. Create MongoDB connection module — `api/src/db/client.ts` (new)

Module-level `MongoClient` and `Db` — matches the project's pattern of module-level state (like `registry.ts` with its `Map`, `bus.ts` with its `Set`).

Exports: `connectDb(uri)`, `getDb()`, `disconnectDb()`.

### 4. Create event store — `api/src/events/store.ts` (new)

Separates DB operations from pub/sub logic. Exports:

- `nextSeq()` — atomic `findOneAndUpdate` on `counters` collection (`{ _id: "events" }`, `$inc: { seq: 1 }`)
- `insertEvent(seq, event)` — writes to `events` collection. `_id` is the event's UUID string
- `getEventsSince(lastSeq)` — `find({ seq: { $gt: lastSeq } }).sort({ seq: 1 })`
- `ensureIndexes()` — creates `{ seq: 1 }` unique index + `{ storedAt: 1 }` TTL index (24h expiry)

### 5. Make bus persistent — `api/src/events/bus.ts` (edit)

- `publish()` becomes **async**: calls `nextSeq()`, `insertEvent()`, then fans out with `seq` attached
- Add `seq?: number` to `AppEvent` type (present after persistence)
- Export `getEventsSince` re-exported from store for convenience

### 6. Make command handlers async — ripple from async `publish()`

- `api/src/slash/registry.ts` — `CommandHandler` type becomes `(args: string) => string | Promise<string>`
- `api/src/slash/commands/logout.ts` — handler becomes `async`, awaits `publish()`
- `api/src/http/chat/commands.ts` — `handleSlashCommand` becomes `async`, awaits `definition.handler()`
- `api/src/http/chat/controller.ts` — awaits `handleSlashCommand()`

### 7. SSE replay — `api/src/http/events/controller.ts` (edit)

- `handleEventsGet(request: Request)` — now accepts request to read `Last-Event-ID`
- Split SSE encoding: `encodeSseSnapshot(payload)` (no `id:` line) for snapshots, `encodeSseEvent(seq, payload)` for bus events
- `start()` becomes `async`:
  1. Send snapshots (no SSE id — so `EventSource.lastEventId` retains the last real seq)
  2. Subscribe to bus first, buffer into array
  3. If `Last-Event-ID` is numeric, call `getEventsSince(lastSeq)`, replay, dedup buffer
  4. Flush buffer, switch to direct streaming
- Live events use `event.seq` as the SSE `id:`

### 8. Async server startup — `api/src/http/server.ts` (edit)

Wrap in `async main()`: connect to MongoDB, call `ensureIndexes()`, then `Bun.serve()`. Pass `request` to `handleEventsGet(request)`.

### 9. Tests

- Add `mongodb-memory-server` as dev dependency — spins up a real in-memory MongoDB per test suite
- `api/tests/events/bus.test.ts` — update: connect to in-memory MongoDB in `beforeAll`, `publish` is now async (await it), add tests for `getEventsSince` replay
- `api/tests/events/store.test.ts` (new) — test `nextSeq` incrementing, `insertEvent`, `getEventsSince` ordering, `ensureIndexes` idempotency
- `api/tests/db/client.test.ts` (new) — test `getDb()` throws before connect, works after connect

## Files touched

| File | Action |
|------|--------|
| `api/package.json` | **Edit** — add `mongodb`, `mongodb-memory-server` (dev) |
| `api/src/config/env.ts` | **Edit** — add `MONGO_URI` |
| `api/src/db/client.ts` | **Create** — connection management |
| `api/src/events/store.ts` | **Create** — event DB operations (nextSeq, insert, query, indexes) |
| `api/src/events/bus.ts` | **Edit** — async publish with persistence, add `seq` to AppEvent |
| `api/src/slash/registry.ts` | **Edit** — CommandHandler allows async return |
| `api/src/slash/commands/logout.ts` | **Edit** — async handler, await publish |
| `api/src/http/chat/commands.ts` | **Edit** — async handleSlashCommand, await handler |
| `api/src/http/chat/controller.ts` | **Edit** — await handleSlashCommand |
| `api/src/http/events/controller.ts` | **Edit** — accept request, replay logic, split SSE encoding |
| `api/src/http/server.ts` | **Edit** — async main(), connect DB, pass request |
| `api/tests/events/bus.test.ts` | **Edit** — async publish, add replay tests |
| `api/tests/events/store.test.ts` | **Create** — store unit tests |
| `api/tests/db/client.test.ts` | **Create** — connection guard tests |

## No frontend changes needed

The browser's `EventSource` automatically sends `Last-Event-ID` on reconnect. Since snapshot events won't carry an SSE `id:`, `lastEventId` will always reflect the last real bus event's seq — exactly right for replay.

## Verification

1. `bun install` — installs mongodb + mongodb-memory-server
2. `bun run build` — compiles
3. `bun run test` — all tests pass (api uses in-memory MongoDB, web unchanged)
4. `bun run dev` — start app (requires local MongoDB or `MONGO_URI` pointing to one)
5. Sign in, type `/logout` — signs out
6. Simulate reconnect: browser devtools → throttle to offline, submit `/logout`, go back online → client receives the event via replay
