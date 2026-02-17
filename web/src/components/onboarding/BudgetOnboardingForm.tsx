import { useMemo, useState } from "react";
import type { ComponentRenderProps } from "@json-render/react";
import type { BudgetOnboardingFormSpecProps } from "@flowly/contracts/onboarding";
import { Button } from "@/components/ui/button";
import {
  FLOWLY_BUDGET_ONBOARDING_SUBMIT_EVENT,
  type BudgetOnboardingSubmitPayload,
} from "./events";

type Cadence = BudgetOnboardingFormSpecProps["cadence"];

export function BudgetOnboardingForm({
  element,
}: ComponentRenderProps<BudgetOnboardingFormSpecProps>) {
  const {
    sessionId,
    name: initialName,
    cadence: initialCadence,
    day: initialDay,
    timezone: initialTimezone,
    cadenceOptions,
    weekdayOptions,
    monthlyDayOptions,
  } = element.props;

  const [name, setName] = useState(initialName);
  const [cadence, setCadence] = useState<Cadence>(initialCadence);
  const [day, setDay] = useState(initialDay);
  const [timezone, setTimezone] = useState(() =>
    initialTimezone === "UTC"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : initialTimezone,
  );

  const timezoneOptions = useMemo(
    () => Intl.supportedValuesOf("timeZone"),
    [],
  );

  const dayOptions = useMemo(() => {
    if (cadence === "monthly") {
      return monthlyDayOptions;
    }

    return weekdayOptions;
  }, [cadence, weekdayOptions, monthlyDayOptions]);

  return (
    <form
      className="mt-3 space-y-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3"
      onSubmit={(event) => {
        event.preventDefault();

        const payload: BudgetOnboardingSubmitPayload = {
          sessionId,
          name,
          cadence,
          day,
          timezone,
        };

        window.dispatchEvent(
          new CustomEvent(FLOWLY_BUDGET_ONBOARDING_SUBMIT_EVENT, {
            detail: payload,
          }),
        );
      }}
    >
      <div className="space-y-1">
        <label className="text-xs text-zinc-400" htmlFor={`budget-name-${sessionId}`}>
          Budget name
        </label>
        <input
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          id={`budget-name-${sessionId}`}
          onChange={(event) => setName(event.currentTarget.value)}
          value={name}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-xs text-zinc-400"
            htmlFor={`budget-cadence-${sessionId}`}
          >
            Cadence
          </label>
          <select
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            id={`budget-cadence-${sessionId}`}
            onChange={(event) => {
              const nextCadence = event.currentTarget.value as Cadence;
              setCadence(nextCadence);
              setDay(
                nextCadence === "monthly"
                  ? monthlyDayOptions[0]!.value
                  : weekdayOptions[0]!.value,
              );
            }}
            value={cadence}
          >
            {cadenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400" htmlFor={`budget-day-${sessionId}`}>
            Day
          </label>
          <select
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            id={`budget-day-${sessionId}`}
            onChange={(event) => setDay(Number(event.currentTarget.value))}
            value={day}
          >
            {dayOptions.map((option) => (
              <option key={`${cadence}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label
          className="text-xs text-zinc-400"
          htmlFor={`budget-timezone-${sessionId}`}
        >
          Timezone
        </label>
        <select
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          id={`budget-timezone-${sessionId}`}
          onChange={(event) => setTimezone(event.currentTarget.value)}
          value={timezone}
        >
          {timezoneOptions.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end">
        <Button type="submit">Create budget</Button>
      </div>
    </form>
  );
}
