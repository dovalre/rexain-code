import { tool } from "ai";
import { z } from "zod";

const taskItemSchema = z.object({
  type: z.enum(["text", "file"]),
  text: z.string(),
  file: z
    .object({
      name: z.string(),
      icon: z.string(),
      color: z.string().optional(),
    })
    .optional(),
});

export const taskSchema = z.object({
  title: z.string(),
  items: z.array(taskItemSchema),
});

export const taskTool = tool({
  description: `Call this tool BEFORE executing any tool to show the user what you are currently doing.

WHEN TO USE:
- Call this BEFORE every createSandbox, createFile, readFile, runCommand, or getSandboxUrl call
- Shows the user a real-time indicator of what tool you're about to use

WHEN NOT TO USE:
- Do NOT call this for todoList or task tool calls themselves
- Do NOT use this for planning (use todoList instead)

HOW TO USE:
Set title to a short description of what you're about to do.
Set items to show the step details.

EXAMPLES:
Title: "Creating sandbox..."
Items: [{ type: "text", text: "Setting up sandbox environment..." }]

Title: "Generating package.json..."
Items: [{ type: "file", text: "package.json", file: { name: "package.json", icon: "file" } }]

Title: "Installing dependencies..."
Items: [{ type: "text", text: "Running npm install..." }]

Title: "Starting dev server..."
Items: [{ type: "text", text: "Running npm run dev..." }]`,
  inputSchema: taskSchema,
  execute: async ({ title, items }) => {
    return {
      success: true,
      message: `Updated task with title: ${title}`,
      title,
      items,
    };
  },
});