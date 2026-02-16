import type {
  BudgetOnboardingCadence,
  BudgetOnboardingDayOption,
  BudgetOnboardingFormSpecProps,
} from "@flowly/contracts/onboarding";
import { ISO_WEEKDAY_OPTIONS } from "./validation";

type OnboardingSpecDraft = {
  name?: string;
  cadence?: BudgetOnboardingCadence;
  day?: number;
  timezone?: string;
};

type BudgetOnboardingFormSpec = {
  root: string;
  elements: Record<
    string,
    {
      type: "BudgetOnboardingForm";
      props: BudgetOnboardingFormSpecProps;
      children: string[];
    }
  >;
};

const CADENCE_OPTIONS: BudgetOnboardingFormSpecProps["cadenceOptions"] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
];

const MONTHLY_DAY_OPTIONS: BudgetOnboardingDayOption[] = Array.from(
  { length: 28 },
  (_, index) => {
    const value = index + 1;
    return { value, label: String(value) };
  },
);

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
          monthlyDayOptions: MONTHLY_DAY_OPTIONS,
        },
        children: [],
      },
    },
  };
}
