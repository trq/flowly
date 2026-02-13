import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlashCommandMenu from "@/components/layout/SlashCommandMenu";

afterEach(cleanup);

const commands = [
  { name: "logout", description: "Sign out of Flowly" },
  { name: "help", description: "Show available commands" },
];

describe("SlashCommandMenu", () => {
  test("renders nothing when commands array is empty", () => {
    const { container } = render(
      <SlashCommandMenu commands={[]} query="" onSelect={() => {}} />
    );
    expect(container.innerHTML).toBe("");
  });

  test("renders command items", () => {
    render(
      <SlashCommandMenu commands={commands} query="" onSelect={() => {}} />
    );

    expect(screen.getByText("Sign out of Flowly")).toBeInTheDocument();
    expect(screen.getByText("Show available commands")).toBeInTheDocument();

    const items = screen.getAllByRole("option");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("data-value", "logout");
    expect(items[1]).toHaveAttribute("data-value", "help");
  });

  test("calls onSelect with command name when item is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <SlashCommandMenu commands={commands} query="" onSelect={onSelect} />
    );

    const items = screen.getAllByRole("option");
    await userEvent.click(items[0]);
    expect(onSelect).toHaveBeenCalledWith("logout");
  });

  test("shows 'Commands' group heading", () => {
    render(
      <SlashCommandMenu commands={commands} query="" onSelect={() => {}} />
    );

    expect(screen.getByText("Commands")).toBeInTheDocument();
  });
});
