import { useRef, useImperativeHandle, forwardRef } from "react";
import {
  PromptInputCommand,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandItem,
  PromptInputCommandList,
} from "@/components/ai-elements/prompt-input";
import type { CommandInfo } from "./events";

export interface SlashCommandMenuHandle {
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
}

interface SlashCommandMenuProps {
  commands: CommandInfo[];
  query: string;
  onSelect: (command: string) => void;
}

export default forwardRef<SlashCommandMenuHandle, SlashCommandMenuProps>(
  function SlashCommandMenu({ commands, query, onSelect }, ref) {
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filtered = commands.filter((cmd) =>
      cmd.name.toLowerCase().includes(query.toLowerCase())
    );

    useImperativeHandle(ref, () => ({
      handleKeyDown(e: React.KeyboardEvent): boolean {
        const root = wrapperRef.current?.querySelector("[cmdk-root]");
        if (!root) return false;

        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          root.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: e.key,
              bubbles: true,
            })
          );
          e.preventDefault();
          return true;
        }

        if (e.key === "Enter" && !e.shiftKey) {
          const selected = root.querySelector(
            '[cmdk-item][data-selected="true"]'
          );
          if (selected instanceof HTMLElement) {
            selected.click();
            e.preventDefault();
            return true;
          }
        }

        return false;
      },
    }));

    if (filtered.length === 0) return null;

    return (
      <div
        ref={wrapperRef}
        className="absolute bottom-full left-0 right-0 z-10 mb-1"
      >
        <PromptInputCommand
          className="border border-(--content-border) shadow-lg"
          shouldFilter={false}
        >
          <PromptInputCommandList>
            <PromptInputCommandEmpty>No commands found</PromptInputCommandEmpty>
            <PromptInputCommandGroup heading="Commands">
              {filtered.map((cmd) => (
                <PromptInputCommandItem
                  key={cmd.name}
                  value={cmd.name}
                  onSelect={() => onSelect(cmd.name)}
                >
                  <span className="font-medium">/{cmd.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {cmd.description}
                  </span>
                </PromptInputCommandItem>
              ))}
            </PromptInputCommandGroup>
          </PromptInputCommandList>
        </PromptInputCommand>
      </div>
    );
  }
);
