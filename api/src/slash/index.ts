// Import command modules to trigger registration
import "./commands/logout";
import "./commands/new";

// Re-export registry helpers
export { list, resolve } from "./registry";
