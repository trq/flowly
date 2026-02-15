import { getDb } from "../db/client";
import type { AppEvent } from "./bus";

type CounterDoc = { _id: string; seq: number };
type EventDoc = { _id: string; seq: number; event: AppEvent; storedAt: Date };

export async function getCurrentSeq(): Promise<number> {
  const counter = await getDb()
    .collection<CounterDoc>("counters")
    .findOne({ _id: "events" });
  return counter?.seq ?? 0;
}

export async function nextSeq(): Promise<number> {
  const result = await getDb()
    .collection<CounterDoc>("counters")
    .findOneAndUpdate(
      { _id: "events" },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );
  return result!.seq;
}

export async function insertEvent(
  seq: number,
  event: AppEvent,
): Promise<void> {
  await getDb()
    .collection<EventDoc>("events")
    .insertOne({
      _id: event.id,
      seq,
      event,
      storedAt: new Date(),
    });
}

export async function getEventsSince(lastSeq: number): Promise<AppEvent[]> {
  const docs = await getDb()
    .collection<EventDoc>("events")
    .find({ seq: { $gt: lastSeq } })
    .sort({ seq: 1 })
    .toArray();

  return docs.map((doc) => ({ ...doc.event, seq: doc.seq }));
}

export async function ensureIndexes(): Promise<void> {
  const col = getDb().collection("events");
  await col.createIndex({ seq: 1 }, { unique: true });
  await col.createIndex(
    { storedAt: 1 },
    { expireAfterSeconds: 24 * 60 * 60 },
  );
}
