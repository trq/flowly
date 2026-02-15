import type { PayCycleCadence } from "../budgets/store";
import { ISO_WEEKDAY_OPTIONS } from "./validation";

type OnboardingSpecDraft = {
  name?: string;
  cadence?: PayCycleCadence;
  day?: number;
  timezone?: string;
};

type BudgetOnboardingFormElementProps = {
  sessionId: string;
  name: string;
  cadence: PayCycleCadence;
  day: number;
  timezone: string;
  cadenceOptions: Array<{ value: PayCycleCadence; label: string }>;
  weekdayOptions: Array<{ value: number; label: string }>;
  monthlyDayMin: number;
  monthlyDayMax: number;
};

type BudgetOnboardingFormSpec = {
  root: string;
  elements: Record<
    string,
    {
      type: "BudgetOnboardingForm";
      props: BudgetOnboardingFormElementProps;
      children: string[];
    }
  >;
};

const CADENCE_OPTIONS: Array<{ value: PayCycleCadence; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
];

export function buildBudgetOnboardingFormSpec(input: {
  sessionId: string;
  draft?: OnboardingSpecDraft;
}): BudgetOnboardingFormSpec {
  const cadence = input.draft?.cadence ?? "monthly";
  const dayFallback = cadence === "monthly" ? 15 : 1;

  return {
    root: "budget-onboarding-form",
    elements: {
      "budget-onboarding-form": {
        type: "BudgetOnboardingForm",
        props: {
          sessionId: input.sessionId,
          name: input.draft?.name ?? "",
          cadence,
          day: input.draft?.day ?? dayFallback,
          timezone: input.draft?.timezone ?? "UTC",
          cadenceOptions: CADENCE_OPTIONS,
          weekdayOptions: [...ISO_WEEKDAY_OPTIONS],
          monthlyDayMin: 1,
          monthlyDayMax: 28,
        },
        children: [],
      },
    },
  };
}
