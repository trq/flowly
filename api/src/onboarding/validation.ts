import type { PayCycleCadence } from "../budgets/store";

export const ISO_WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

export function validateBudgetName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Budget name is required.");
  }
}

export function validateTimezone(timezone: string): void {
  const trimmed = timezone.trim();
  if (!trimmed) {
    throw new Error("Timezone is required.");
  }
}

export function validatePayCycleDay(
  cadence: PayCycleCadence,
  day: number,
): void {
  if (!Number.isInteger(day)) {
    throw new Error("Pay cycle day must be an integer.");
  }

  if (cadence === "weekly" || cadence === "fortnightly") {
    if (day < 1 || day > 7) {
      throw new Error(`${cadence} pay cycle day must be between 1 and 7.`);
    }
    return;
  }

  if (day < 1 || day > 28) {
    throw new Error("Monthly pay cycle day must be between 1 and 28.");
  }
}
