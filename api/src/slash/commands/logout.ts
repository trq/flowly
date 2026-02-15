import { publish } from "../../events/bus";
import { register } from "../registry";

register({
  name: "logout",
  description: "Sign out of Flowly",
  async handler(_, context) {
    await publish({
      id: crypto.randomUUID(),
      channel: "session",
      type: "session.logout",
      payload: context?.userId ? { userId: context.userId } : {},
      sentAt: new Date().toISOString(),
    });
    return "Signing out…";
  },
});
