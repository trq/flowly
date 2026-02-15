import { publish } from "../events/bus";
import { register } from "./registry";

register({
  name: "logout",
  description: "Sign out of Flowly",
  async handler() {
    await publish({
      id: `evt_session_logout_${Date.now()}`,
      channel: "session",
      type: "session.logout",
      payload: {},
      sentAt: new Date().toISOString(),
    });
    return "Signing out…";
  },
});
