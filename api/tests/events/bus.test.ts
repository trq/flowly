import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
} from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, disconnectDb } from "../../src/db/client";
import { ensureIndexes } from "../../src/events/store";
import {
  publish,
  subscribe,
  unsubscribe,
  getEventsSince,
  type AppEvent,
} from "../../src/events/bus";

function makeEvent(overrides: Partial<AppEvent> = {}): AppEvent {
  return {
    id: crypto.randomUUID(),
    channel: "test",
    type: "test.event",
    payload: {},
    sentAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("event bus", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectDb(mongod.getUri());
    await ensureIndexes();
  });

  afterAll(async () => {
    await disconnectDb();
    await mongod.stop();
  });

  test("subscriber receives published events with seq", async () => {
    const received: AppEvent[] = [];
    const cb = (e: AppEvent) => received.push(e);

    subscribe(cb);
    const event = makeEvent();
    await publish(event);
    unsubscribe(cb);

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe(event.id);
    expect(received[0].seq).toBeNumber();
  });

  test("unsubscribed callback stops receiving events", async () => {
    const received: AppEvent[] = [];
    const cb = (e: AppEvent) => received.push(e);

    subscribe(cb);
    await publish(makeEvent());
    unsubscribe(cb);
    await publish(makeEvent());

    expect(received).toHaveLength(1);
  });

  test("multiple subscribers all receive the event", async () => {
    const a: AppEvent[] = [];
    const b: AppEvent[] = [];
    const cbA = (e: AppEvent) => a.push(e);
    const cbB = (e: AppEvent) => b.push(e);

    subscribe(cbA);
    subscribe(cbB);
    await publish(makeEvent());
    unsubscribe(cbA);
    unsubscribe(cbB);

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  test("getEventsSince replays persisted events", async () => {
    const baseline = (await publish(makeEvent())) as void;
    // Get the seq of the last event to use as baseline
    const evt1 = makeEvent();
    await publish(evt1);
    const evt2 = makeEvent();
    await publish(evt2);

    // We need to find the seq — get all events and find our baseline
    const allEvents = await getEventsSince(0);
    const evt1Entry = allEvents.find((e) => e.id === evt1.id);
    const evt2Entry = allEvents.find((e) => e.id === evt2.id);

    expect(evt1Entry).toBeDefined();
    expect(evt2Entry).toBeDefined();
    expect(evt2Entry!.seq!).toBeGreaterThan(evt1Entry!.seq!);

    // Replay since evt1's seq should include evt2 but not evt1
    const replayed = await getEventsSince(evt1Entry!.seq!);
    expect(replayed.find((e) => e.id === evt1.id)).toBeUndefined();
    expect(replayed.find((e) => e.id === evt2.id)).toBeDefined();
  });
});
