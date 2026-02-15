export type SlashCommand = {
  name: string;
  description: string;
  handler: (args: string) => string | Promise<string>;
};

export type SlashCommandInfo = {
  name: string;
  description: string;
};

const commands = new Map<string, SlashCommand>();

export function register(command: SlashCommand): void {
  commands.set(command.name, command);
}

export function resolve(name: string): SlashCommand | undefined {
  return commands.get(name);
}

export function list(): SlashCommandInfo[] {
  return Array.from(commands.values(), ({ name, description }) => ({
    name,
    description,
  }));
}
