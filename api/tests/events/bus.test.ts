import { describe, test, expect } from "bun:test";
import {
  publish,
  subscribe,
  unsubscribe,
  type AppEvent,
} from "../../src/events/bus";

function makeEvent(overrides: Partial<AppEvent> = {}): AppEvent {
  return {
    id: "evt_test",
    channel: "test",
    type: "test.event",
    payload: {},
    sentAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("event bus", () => {
  test("subscriber receives published events", () => {
    const received: AppEvent[] = [];
    const cb = (e: AppEvent) => received.push(e);

    subscribe(cb);
    const event = makeEvent();
    publish(event);
    unsubscribe(cb);

    expect(received).toHaveLength(1);
    expect(received[0]).toBe(event);
  });

  test("unsubscribed callback stops receiving events", () => {
    const received: AppEvent[] = [];
    const cb = (e: AppEvent) => received.push(e);

    subscribe(cb);
    publish(makeEvent({ id: "1" }));
    unsubscribe(cb);
    publish(makeEvent({ id: "2" }));

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe("1");
  });

  test("multiple subscribers all receive the event", () => {
    const a: AppEvent[] = [];
    const b: AppEvent[] = [];
    const cbA = (e: AppEvent) => a.push(e);
    const cbB = (e: AppEvent) => b.push(e);

    subscribe(cbA);
    subscribe(cbB);
    publish(makeEvent());
    unsubscribe(cbA);
    unsubscribe(cbB);

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });
});
