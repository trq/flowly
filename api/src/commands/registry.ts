export type CommandHandler = (args: string) => string;

export type CommandDefinition = {
  name: string;
  description: string;
  handler: CommandHandler;
};

export type CommandInfo = {
  name: string;
  description: string;
};

const commands = new Map<string, CommandDefinition>();

export function register(definition: CommandDefinition): void {
  commands.set(definition.name, definition);
}

export function resolve(name: string): CommandDefinition | undefined {
  return commands.get(name);
}

export function list(): CommandInfo[] {
  return Array.from(commands.values(), ({ name, description }) => ({
    name,
    description,
  }));
}
