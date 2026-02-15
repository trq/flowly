export type BudgetOnboardingCadence =
  | "weekly"
  | "fortnightly"
  | "monthly";

export type BudgetOnboardingDayOption = {
  value: number;
  label: string;
};

export type BudgetOnboardingCadenceOption = {
  value: BudgetOnboardingCadence;
  label: string;
};

export type BudgetOnboardingFormSpecProps = {
  sessionId: string;
  name: string;
  cadence: BudgetOnboardingCadence;
  day: number;
  timezone: string;
  cadenceOptions: BudgetOnboardingCadenceOption[];
  weekdayOptions: BudgetOnboardingDayOption[];
  monthlyDayOptions: BudgetOnboardingDayOption[];
};

export type BudgetOnboardingSubmitData = {
  sessionId: string;
  name: string;
  cadence: BudgetOnboardingCadence;
  day: number;
  timezone: string;
};
