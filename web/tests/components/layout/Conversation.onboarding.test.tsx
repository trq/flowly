import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const sendMessage = vi.fn();
const stop = vi.fn();

vi.mock("@shoojs/react", () => ({
  useShooAuth: () => ({
    identity: {
      token: "test-token",
      userId: "ps_web_user_1",
    },
  }),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          { type: "text", text: "Let's set up your budget." },
          {
            type: "data-budget-onboarding-form",
            data: {
              sessionId: "session-1",
              spec: {
                elements: {
                  "budget-onboarding-form": {
                    children: [],
                    props: {
                      cadence: "monthly",
                      cadenceOptions: [
                        { label: "Weekly", value: "weekly" },
                        { label: "Fortnightly", value: "fortnightly" },
                        { label: "Monthly", value: "monthly" },
                      ],
                      day: 15,
                      monthlyDayOptions: [
                        { label: "1", value: 1 },
                        { label: "2", value: 2 },
                        { label: "3", value: 3 },
                        { label: "4", value: 4 },
                        { label: "5", value: 5 },
                        { label: "6", value: 6 },
                        { label: "7", value: 7 },
                        { label: "8", value: 8 },
                        { label: "9", value: 9 },
                        { label: "10", value: 10 },
                        { label: "11", value: 11 },
                        { label: "12", value: 12 },
                        { label: "13", value: 13 },
                        { label: "14", value: 14 },
                        { label: "15", value: 15 },
                        { label: "16", value: 16 },
                        { label: "17", value: 17 },
                        { label: "18", value: 18 },
                        { label: "19", value: 19 },
                        { label: "20", value: 20 },
                        { label: "21", value: 21 },
                        { label: "22", value: 22 },
                        { label: "23", value: 23 },
                        { label: "24", value: 24 },
                        { label: "25", value: 25 },
                        { label: "26", value: 26 },
                        { label: "27", value: 27 },
                        { label: "28", value: 28 },
                      ],
                      name: "",
                      sessionId: "session-1",
                      timezone: "America/New_York",
                      weekdayOptions: [
                        { label: "Mon", value: 1 },
                        { label: "Tue", value: 2 },
                        { label: "Wed", value: 3 },
                        { label: "Thu", value: 4 },
                        { label: "Fri", value: 5 },
                        { label: "Sat", value: 6 },
                        { label: "Sun", value: 7 },
                      ],
                    },
                    type: "BudgetOnboardingForm",
                  },
                },
                root: "budget-onboarding-form",
              },
            },
          },
        ],
      },
    ],
    sendMessage,
    status: "ready",
    stop,
  }),
}));

import Conversation from "@/components/layout/Conversation";

describe("Conversation onboarding", () => {
  beforeEach(() => {
    sendMessage.mockClear();
    stop.mockClear();
  });

  test("renders onboarding form from json-render data part and sends structured submit payload", async () => {
    const user = userEvent.setup();
    render(<Conversation />);

    await user.type(screen.getByLabelText("Budget name"), "Budget 2026");
    await user.click(screen.getByRole("button", { name: "Create budget" }));

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        parts: [
          expect.objectContaining({
            data: expect.objectContaining({
              cadence: "monthly",
              day: 15,
              name: "Budget 2026",
              sessionId: "session-1",
              timezone: "America/New_York",
            }),
            type: "data-budget-onboarding-submit",
          }),
        ],
      }),
    );
  });
});
