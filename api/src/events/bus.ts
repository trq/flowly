import { nextSeq, insertEvent, getEventsSince } from "./store";

export type AppEvent = {
  id: string;
  channel: string;
  type: string;
  payload: unknown;
  sentAt: string;
  seq?: number;
};

type Subscriber = (event: AppEvent) => void;

const subscribers = new Set<Subscriber>();

export async function publish(event: AppEvent): Promise<void> {
  const seq = await nextSeq();
  await insertEvent(seq, event);

  const persisted = { ...event, seq };
  for (const subscriber of subscribers) {
    subscriber(persisted);
  }
}

export function subscribe(callback: Subscriber): void {
  subscribers.add(callback);
}

export function unsubscribe(callback: Subscriber): void {
  subscribers.delete(callback);
}

export { getEventsSince };
