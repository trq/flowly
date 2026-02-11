import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import { MessageSquareIcon } from 'lucide-react'
import { useState } from 'react'
import {
  Conversation as AIConversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input'

const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '')
const chatApiPath = rawApiBaseUrl ? `${rawApiBaseUrl}/chat` : '/chat'

export default function Conversation() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: chatApiPath,
    }),
  })

  return (
    <section className="h-full min-h-64 px-2 py-4">
      <div className="flex h-full min-h-[32rem] flex-col rounded-xl border border-(--content-border) bg-card">
        <AIConversation className="relative min-h-0">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                description="Ask Flowly anything about your budget."
                icon={<MessageSquareIcon className="size-8" />}
                title="Start a conversation"
              />
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return <MessageResponse key={`${message.id}-${i}`}>{part.text}</MessageResponse>
                        default:
                          return null
                      }
                    })}
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </AIConversation>

        <div className="border-t border-(--content-border) p-3">
          <PromptInput
            className="w-full"
            onSubmit={({ text }) => {
              if (!text.trim()) {
                return
              }

              sendMessage({ text })
              setInput('')
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(event) => setInput(event.currentTarget.value)}
                placeholder="Ask Flowly about your budget..."
                value={input}
              />
            </PromptInputBody>
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                disabled={!input.trim() && status !== 'streaming'}
                onStop={stop}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </section>
  )
}
