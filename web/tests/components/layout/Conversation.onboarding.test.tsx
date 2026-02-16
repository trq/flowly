import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FLOWLY_EVENT_NAME } from "@/lib/events";

const sendMessage = vi.fn();
const stop = vi.fn();
let mockMessages: Array<Record<string, unknown>> = [];
let mockStatus = "ready";

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
    messages: mockMessages,
    sendMessage,
    status: mockStatus,
    stop,
  }),
}));

import Conversation from "@/components/layout/Conversation";

function buildBudgetOnboardingAssistantMessage() {
  return {
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
                  monthlyDayOptions: Array.from({ length: 28 }, (_, index) => ({
                    label: String(index + 1),
                    value: index + 1,
                  })),
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
  };
}

describe("Conversation onboarding", () => {
  beforeEach(() => {
    sendMessage.mockClear();
    stop.mockClear();
    mockMessages = [buildBudgetOnboardingAssistantMessage()];
    mockStatus = "ready";
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

  test("does not render an empty user bubble for structured submit-only messages", () => {
    mockMessages = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "/new budget" }],
      },
      {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "Starting budget onboarding." }],
      },
      {
        id: "user-2",
        role: "user",
        parts: [
          {
            type: "data-budget-onboarding-submit",
            data: {
              sessionId: "session-1",
              name: "2026",
              cadence: "monthly",
              day: 15,
              timezone: "Australia/Sydney",
            },
          },
        ],
      },
      {
        id: "assistant-2",
        role: "assistant",
        parts: [{ type: "text", text: "Budget created." }],
      },
    ];

    const { container } = render(<Conversation />);

    expect(screen.getByText("/new budget")).toBeDefined();
    expect(screen.getByText("Budget created.")).toBeDefined();
    expect(container.querySelectorAll(".is-user")).toHaveLength(1);
  });

  test("removes onboarding form from chat after onboarding.completed event", async () => {
    render(<Conversation />);
    expect(screen.getByLabelText("Budget name")).toBeDefined();

    window.dispatchEvent(
      new CustomEvent(FLOWLY_EVENT_NAME, {
        detail: {
          channel: "onboarding",
          type: "onboarding.completed",
          payload: {
            sessionId: "session-1",
            userId: "ps_web_user_1",
            status: "completed",
            currentStep: "pools",
          },
        },
      }),
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("Budget name")).toBeNull();
    });
  });

  test("shows a chat loading overlay while waiting for a response", () => {
    mockStatus = "submitted";
    render(<Conversation />);

    expect(
      screen.getByRole("status", { name: "Processing request" }),
    ).toBeDefined();
  });
});
