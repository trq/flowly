import { startBudgetOnboarding } from "../../onboarding/service";
import { register } from "../registry";

register({
  name: "new",
  description: "Create new resources (e.g. /new budget)",
  async handler(args, context) {
    const target = args.trim().toLowerCase();

    if (target !== "budget") {
      return "Usage: /new budget";
    }

    const userId = context?.userId?.trim();
    if (!userId) {
      return "Unable to start budget onboarding: missing user context.";
    }

    await startBudgetOnboarding({ userId });
    return "Starting budget onboarding. Let's set up your budget.";
  },
});
