export type AppEvent = {
  id: string;
  channel: string;
  type: string;
  payload: unknown;
  sentAt: string;
};

type Subscriber = (event: AppEvent) => void;

const subscribers = new Set<Subscriber>();

export function publish(event: AppEvent): void {
  for (const subscriber of subscribers) {
    subscriber(event);
  }
}

export function subscribe(callback: Subscriber): void {
  subscribers.add(callback);
}

export function unsubscribe(callback: Subscriber): void {
  subscribers.delete(callback);
}
