import { describe, expect, test } from "bun:test";
import { ISO_WEEKDAY_OPTIONS } from "../../src/onboarding/validation";

describe("onboarding validation constants", () => {
  test("ISO weekday options map to Mon..Sun labels", () => {
    expect(ISO_WEEKDAY_OPTIONS).toEqual([
      { value: 1, label: "Mon" },
      { value: 2, label: "Tue" },
      { value: 3, label: "Wed" },
      { value: 4, label: "Thu" },
      { value: 5, label: "Fri" },
      { value: 6, label: "Sat" },
      { value: 7, label: "Sun" },
    ]);
  });
});
