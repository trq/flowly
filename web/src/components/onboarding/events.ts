export const FLOWLY_BUDGET_ONBOARDING_SUBMIT_EVENT =
  "flowly:budget-onboarding-submit";

export type BudgetOnboardingSubmitPayload = {
  sessionId: string;
  name: string;
  cadence: "weekly" | "fortnightly" | "monthly";
  day: number;
  timezone: string;
};
