import { tool } from "ai";
import { z } from "zod";

const todoItemSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  status: z.enum([
    "pending",
    "completed"
  ]),
});

export const todoTool = tool({
  description: `Create and manage a task list for the current session.

WHEN TO USE:
- ALWAYS use this tool FIRST before any sandbox operation - plan your tasks
- Complex multi-step tasks requiring 3 or more distinct steps
- When the user provides multiple requirements or a checklist
- After receiving new instructions - immediately capture them as todos
- When completing a task - mark it as completed
- Use ONE tool call with ALL todos in the list

WHEN NOT TO USE:
- A single, straightforward task that can be done in one step
- Trivial tasks requiring fewer than 3 minor steps
- Purely conversational or informational queries

TASK STATES:
- "pending": Task not yet started
- "completed": Task finished successfully

USAGE:
- Send ALL todos in a single tool call using the "todos" array
- Replace the entire list each time (do not send partial updates)
- Update status to "completed" as soon as you finish a task`,
  inputSchema: z.object({
    todos: z
      .array(todoItemSchema)
      .describe("The complete list of todo items. Always include ALL todos, this replaces the entire list."),
  }),
  execute: async ({ todos }) => {
    return {
      success: true,
      message: `Updated todo list with ${todos.length} items`,
      todos,
    };
  },
});