import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, disconnectDb } from "../../../src/db/client";
import {
  getSubscriberCountForTests,
  getCurrentSeq,
  publish,
  type AppEvent,
} from "../../../src/events/bus";
import { ensureIndexes } from "../../../src/events/store";
import { handleEventsGet } from "../../../src/http/events/controller";
import { startBudgetOnboarding } from "../../../src/onboarding/service";

const decoder = new TextDecoder();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSseFrame(frame: string): { id: string | null; data: unknown } {
  const lines = frame.split("\n");
  const idLine = lines.find((line) => line.startsWith("id: "));
  const data = lines
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length))
    .join("\n");

  return {
    id: idLine ? idLine.slice("id: ".length) : null,
    data: JSON.parse(data),
  };
}

async function collectSseFrames(
  response: Response,
  minCount: number,
): Promise<string[]> {
  if (!response.body) {
    throw new Error("Expected SSE response body");
  }

  const reader = response.body.getReader();
  const frames: string[] = [];
  let buffer = "";

  try {
    while (frames.length < minCount) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value);
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        frames.push(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (frames.length >= minCount) break;
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore cancellation errors from already-errored streams.
    }
  }

  return frames;
}

describe("events SSE controller", () => {
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

  test("initial stream emits a cursor id so reconnect can replay from it", async () => {
    const firstResponse = handleEventsGet(new Request("http://localhost/events"));
    const firstFrames = await collectSseFrames(firstResponse, 3);
    const parsed = firstFrames.map(parseSseFrame);

    const cursor = parsed.find(({ data }) => {
      if (!isRecord(data)) return false;
      return data.channel === "events" && data.type === "events.cursor";
    });

    expect(cursor).toBeDefined();
    expect(cursor!.id).toBeString();
    expect(cursor!.id).toMatch(/^\d+$/);

    const event: AppEvent = {
      id: crypto.randomUUID(),
      channel: "session",
      type: "session.logout",
      payload: {},
      sentAt: new Date().toISOString(),
    };
    await publish(event);

    const secondResponse = handleEventsGet(
      new Request("http://localhost/events", {
        headers: { "Last-Event-ID": cursor!.id! },
      }),
    );
    const secondFrames = await collectSseFrames(secondResponse, 3);
    const replayed = secondFrames
      .map(parseSseFrame)
      .find(({ data }) => isRecord(data) && data.id === event.id);

    expect(replayed).toBeDefined();
    expect(Number(replayed!.id)).toBeGreaterThan(Number(cursor!.id));
  });

  test("startup failure unsubscribes buffered listeners", async () => {
    const before = getSubscriberCountForTests();
    await disconnectDb();

    try {
      const response = handleEventsGet(
        new Request("http://localhost/events", {
          headers: { "Last-Event-ID": "0" },
        }),
      );
      const reader = response.body!.getReader();
      let failed = false;

      for (let i = 0; i < 6; i++) {
        try {
          const { done } = await reader.read();
          if (done) break;
        } catch {
          failed = true;
          break;
        }
      }

      try {
        await reader.cancel();
      } catch {
        // Ignore cancellation errors from already-errored streams.
      }

      expect(failed).toBeTrue();
      expect(getSubscriberCountForTests()).toBe(before);
    } finally {
      await connectDb(mongod.getUri());
      await ensureIndexes();
    }
  });

  test("startup includes onboarding snapshot for user with active onboarding session", async () => {
    const userId = "ps_events_onboarding_user";
    const started = await startBudgetOnboarding({ userId });

    const response = handleEventsGet(
      new Request("http://localhost/events", {
        headers: { "x-flowly-user-id": userId },
      }),
    );
    const frames = await collectSseFrames(response, 4);
    const parsed = frames.map(parseSseFrame);

    const snapshot = parsed.find(({ data }) => {
      if (!isRecord(data)) return false;
      return data.channel === "onboarding" && data.type === "onboarding.snapshot";
    });

    expect(snapshot).toBeDefined();
    expect(snapshot!.id).toBeNull();
    expect(snapshot!.data).toEqual(
      expect.objectContaining({
        channel: "onboarding",
        type: "onboarding.snapshot",
        payload: expect.objectContaining({
          sessionId: started.sessionId,
          userId,
          status: "active",
        }),
      }),
    );
  });

  test("replay filters user-scoped events to the authenticated user", async () => {
    const userA = "ps_events_user_a";
    const userB = "ps_events_user_b";
    const boundary = await getCurrentSeq();

    const eventA: AppEvent = {
      id: crypto.randomUUID(),
      channel: "budgets",
      type: "budgets.created",
      payload: { budgetId: crypto.randomUUID(), userId: userA },
      sentAt: new Date().toISOString(),
    };
    const eventB: AppEvent = {
      id: crypto.randomUUID(),
      channel: "budgets",
      type: "budgets.created",
      payload: { budgetId: crypto.randomUUID(), userId: userB },
      sentAt: new Date().toISOString(),
    };

    await publish(eventA);
    await publish(eventB);

    const response = handleEventsGet(
      new Request("http://localhost/events", {
        headers: {
          "Last-Event-ID": String(boundary),
          "x-flowly-user-id": userA,
        },
      }),
    );
    const frames = await collectSseFrames(response, 3);
    const parsed = frames.map(parseSseFrame);

    const seenA = parsed.find(
      ({ data }) => isRecord(data) && data.id === eventA.id,
    );
    const seenB = parsed.find(
      ({ data }) => isRecord(data) && data.id === eventB.id,
    );

    expect(seenA).toBeDefined();
    expect(seenB).toBeUndefined();
  });
});
