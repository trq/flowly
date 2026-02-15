import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, disconnectDb } from "../../src/db/client";
import {
  nextSeq,
  insertEvent,
  getEventsSince,
  ensureIndexes,
} from "../../src/events/store";
import type { AppEvent } from "../../src/events/bus";

function makeEvent(id?: string): AppEvent {
  return {
    id: id ?? crypto.randomUUID(),
    channel: "test",
    type: "test.event",
    payload: {},
    sentAt: new Date().toISOString(),
  };
}

describe("event store", () => {
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

  test("nextSeq increments atomically", async () => {
    const s1 = await nextSeq();
    const s2 = await nextSeq();
    const s3 = await nextSeq();
    expect(s2).toBe(s1 + 1);
    expect(s3).toBe(s2 + 1);
  });

  test("insertEvent and getEventsSince", async () => {
    const seq1 = await nextSeq();
    const evt1 = makeEvent("evt_store_1");
    await insertEvent(seq1, evt1);

    const seq2 = await nextSeq();
    const evt2 = makeEvent("evt_store_2");
    await insertEvent(seq2, evt2);

    const events = await getEventsSince(seq1 - 1);
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.find((e) => e.id === "evt_store_1")).toBeDefined();
    expect(events.find((e) => e.id === "evt_store_2")).toBeDefined();
  });

  test("getEventsSince returns events in seq order", async () => {
    const baseline = await nextSeq();
    await insertEvent(baseline, makeEvent("evt_order_a"));

    const seq2 = await nextSeq();
    await insertEvent(seq2, makeEvent("evt_order_b"));

    const events = await getEventsSince(baseline - 1);
    const seqs = events.map((e) => e.seq!);
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i]).toBeGreaterThan(seqs[i - 1]);
    }
  });

  test("ensureIndexes is idempotent", async () => {
    await ensureIndexes();
    await ensureIndexes();
  });
});
