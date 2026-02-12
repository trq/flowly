import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { MessageSquareIcon } from "lucide-react";
import { useState } from "react";
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

const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "");
const chatApiPath = rawApiBaseUrl ? `${rawApiBaseUrl}/chat` : "/chat";

export default function Conversation() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: chatApiPath,
    }),
  });

  return (
    <section className="h-full min-h-64 px-2 pt-0 pb-4">
      <Card className="flowly-conversation flowly-surface flex h-full min-h-[32rem] flex-col">
        <AIConversation className="relative min-h-0">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState>
                <div className="text-muted-foreground">
                  <MessageSquareIcon className="size-8" />
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((message) => (
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
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </AIConversation>

        <div className="p-3">
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
      </Card>
    </section>
  );
}
