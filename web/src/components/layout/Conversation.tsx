import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import type { Spec } from "@json-render/react";
import { LoaderCircleIcon, MessageSquareIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShooAuth } from "@shoojs/react";
import {
  Conversation as AIConversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Card } from "@/components/ui/card";
import { FLOWLY_EVENT_NAME } from "@/lib/events";
import OnboardingRenderer from "@/components/onboarding/OnboardingRenderer";
import {
  FLOWLY_BUDGET_ONBOARDING_SUBMIT_EVENT,
  type BudgetOnboardingSubmitPayload,
} from "@/components/onboarding/events";
import {
  isAnyOnboardingEvent,
  isCommandsSnapshotEvent,
  isOnboardingCancelledEvent,
  isOnboardingCompletedEvent,
  isOnboardingSnapshotEvent,
  isOnboardingStartedEvent,
  type CommandInfo,
} from "./events";
import SlashCommandMenu, {
  type SlashCommandMenuHandle,
} from "./SlashCommandMenu";

type MessageWithParts = {
  id: string;
  role: "assistant" | "user" | "system";
  parts: Array<{ type: string; text?: string }>;
};

const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "");
const chatApiPath = rawApiBaseUrl ? `${rawApiBaseUrl}/chat` : "/chat";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSpec(value: unknown): value is Spec {
  return (
    isRecord(value) &&
    typeof value.root === "string" &&
    isRecord(value.elements)
  );
}

function isBudgetOnboardingSubmitPayload(
  value: unknown,
): value is BudgetOnboardingSubmitPayload {
  if (!isRecord(value)) return false;

  return (
    typeof value.sessionId === "string" &&
    typeof value.name === "string" &&
    (value.cadence === "weekly" ||
      value.cadence === "fortnightly" ||
      value.cadence === "monthly") &&
    typeof value.day === "number" &&
    Number.isFinite(value.day) &&
    typeof value.timezone === "string"
  );
}

function readOnboardingFormPart(
  part: unknown,
): { sessionId: string; spec: Spec } | null {
  if (!isRecord(part)) return null;
  if (part.type !== "data-budget-onboarding-form") return null;
  if (!("data" in part) || !isRecord(part.data)) return null;
  if (typeof part.data.sessionId !== "string") return null;
  if (!isSpec(part.data.spec)) return null;

  return {
    sessionId: part.data.sessionId,
    spec: part.data.spec,
  };
}

export default function Conversation() {
  const [input, setInput] = useState("");
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [activeOnboardingSessionId, setActiveOnboardingSessionId] = useState<
    string | null
  >(null);
  const [closedOnboardingSessionIds, setClosedOnboardingSessionIds] = useState<
    Record<string, true>
  >({});
  const [onboardingSpecsBySessionId, setOnboardingSpecsBySessionId] = useState<
    Record<string, Spec>
  >({});
  const menuRef = useRef<SlashCommandMenuHandle>(null);
  const { identity } = useShooAuth();
  const authTokenRef = useRef<string | undefined>(identity.token);
  authTokenRef.current = identity.token;

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: chatApiPath,
      headers: (): Record<string, string> => {
        const token = authTokenRef.current;
        if (!token) return {};
        return { Authorization: `Bearer ${token}` };
      },
    }),
  });

  useEffect(() => {
    const onAppEvent = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;

      if (isCommandsSnapshotEvent(detail)) {
        setCommands(detail.payload.commands);
        return;
      }

      if (!isAnyOnboardingEvent(detail)) {
        return;
      }

      if (isOnboardingSnapshotEvent(detail) || isOnboardingStartedEvent(detail)) {
        setActiveOnboardingSessionId(detail.payload.sessionId);
        setClosedOnboardingSessionIds((previous) => {
          if (!(detail.payload.sessionId in previous)) {
            return previous;
          }
          const next = { ...previous };
          delete next[detail.payload.sessionId];
          return next;
        });

        const uiSpec = detail.payload.uiSpec;
        if (isSpec(uiSpec)) {
          setOnboardingSpecsBySessionId((previous) => ({
            ...previous,
            [detail.payload.sessionId]: uiSpec,
          }));
        }
        return;
      }

      if (isOnboardingCompletedEvent(detail) || isOnboardingCancelledEvent(detail)) {
        setActiveOnboardingSessionId((previous) =>
          previous === detail.payload.sessionId ? null : previous,
        );
        setClosedOnboardingSessionIds((previous) => ({
          ...previous,
          [detail.payload.sessionId]: true,
        }));
        setOnboardingSpecsBySessionId((previous) => {
          const next = { ...previous };
          delete next[detail.payload.sessionId];
          return next;
        });
      }
    };

    window.addEventListener(FLOWLY_EVENT_NAME, onAppEvent);
    return () => window.removeEventListener(FLOWLY_EVENT_NAME, onAppEvent);
  }, []);

  useEffect(() => {
    const onSubmit = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isBudgetOnboardingSubmitPayload(detail)) return;

      sendMessage({
        parts: [
          {
            type: "data-budget-onboarding-submit",
            data: detail,
          },
        ],
      });
    };

    window.addEventListener(FLOWLY_BUDGET_ONBOARDING_SUBMIT_EVENT, onSubmit);
    return () =>
      window.removeEventListener(FLOWLY_BUDGET_ONBOARDING_SUBMIT_EVENT, onSubmit);
  }, [sendMessage]);

  const onboardingSpecsFromMessages = useMemo(() => {
    let latestSessionId: string | null = null;

    const bySessionId = messages.reduce<Record<string, Spec>>((result, message) => {
      for (const part of message.parts) {
        const parsed = readOnboardingFormPart(part);
        if (!parsed) continue;
        result[parsed.sessionId] = parsed.spec;
        if (!(parsed.sessionId in closedOnboardingSessionIds)) {
          latestSessionId = parsed.sessionId;
        }
      }
      return result;
    }, {});

    return {
      bySessionId,
      latestSessionId,
    };
  }, [closedOnboardingSessionIds, messages]);

  const textMessages = useMemo(
    () =>
      messages.reduce<MessageWithParts[]>((result, message) => {
        const textParts = message.parts.filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text" && typeof part.text === "string" && part.text.length > 0,
        );

        if (textParts.length === 0) {
          return result;
        }

        result.push({
          id: message.id,
          role: message.role,
          parts: textParts,
        });
        return result;
      }, []),
    [messages],
  );

  const effectiveOnboardingSessionId =
    activeOnboardingSessionId ?? onboardingSpecsFromMessages.latestSessionId;

  const activeOnboardingSpec = effectiveOnboardingSessionId
    ? onboardingSpecsFromMessages.bySessionId[effectiveOnboardingSessionId] ??
      onboardingSpecsBySessionId[effectiveOnboardingSessionId] ??
      null
    : null;
  const hasActiveOnboardingForm =
    Boolean(effectiveOnboardingSessionId) && Boolean(activeOnboardingSpec);
  const isAwaitingResponse =
    status === "submitted" || status === "streaming";

  const showMenu = input.startsWith("/");
  const query = showMenu ? input.slice(1).toLowerCase() : "";

  return (
    <section className="h-full min-h-64 px-2 pt-0 pb-4">
      <Card className="flowly-conversation flowly-surface relative flex h-full min-h-[32rem] flex-col">
        <AIConversation className="relative min-h-0">
          <ConversationContent>
            {textMessages.length === 0 && !hasActiveOnboardingForm ? (
              <ConversationEmptyState>
                <div className="text-muted-foreground">
                  <MessageSquareIcon className="size-8" />
                </div>
              </ConversationEmptyState>
            ) : (
              <>
                {textMessages.map((message) => (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case "text":
                            return (
                              <MessageResponse key={`${message.id}-${i}`}>
                                {part.text}
                              </MessageResponse>
                            );
                          default:
                            return null;
                        }
                      })}
                    </MessageContent>
                  </Message>
                ))}

                {effectiveOnboardingSessionId && activeOnboardingSpec && (
                  <Message
                    from="assistant"
                    key={`onboarding-${effectiveOnboardingSessionId}`}
                  >
                    <MessageContent>
                      <OnboardingRenderer spec={activeOnboardingSpec} />
                    </MessageContent>
                  </Message>
                )}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </AIConversation>

        <div className="relative p-3">
          {showMenu && (
            <SlashCommandMenu
              ref={menuRef}
              commands={commands}
              query={query}
              onSelect={(name) => {
                sendMessage({ text: `/${name}` });
                setInput("");
              }}
            />
          )}
          <PromptInput
            className="w-full"
            onSubmit={({ text }) => {
              if (!text.trim()) {
                return;
              }

              sendMessage({ text });
              setInput("");
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(event) => setInput(event.currentTarget.value)}
                onKeyDown={(e) => {
                  if (showMenu && menuRef.current?.handleKeyDown(e)) return;
                }}
                placeholder="Ask me about your budget..."
                value={input}
              />
            </PromptInputBody>
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                className="bg-sky-600 text-white hover:bg-sky-600"
                disabled={!input.trim() && status !== "streaming"}
                onStop={stop}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>

        {isAwaitingResponse && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/20 backdrop-blur-[1px]">
            <div
              aria-label="Processing request"
              className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-sm text-slate-100 shadow-lg"
              role="status"
            >
              <LoaderCircleIcon className="size-4 animate-spin" />
              <span>Processing request</span>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
