import { tool } from 'ai';
import { z } from 'zod';
import { Sandbox } from '@vercel/sandbox';

const runCommandSchema = z.object({
  command: z
    .string()
    .describe("The base command to run (e.g., 'npm', 'node', 'python', 'ls', 'cat')"),
  args: z
    .array(z.string())
    .optional()
    .describe('Array of arguments for the command'),
  sudo: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to run the command with sudo'),
  detached: z
    .boolean()
    .optional()
    .default(false)
    .describe('Run command in background'),
  sandboxName: z
    .string()
    .describe('The name of the sandbox to run the command in'),
});

export const runCommandTool = tool({
  description: `Execute a command inside a sandbox.`,
  inputSchema: runCommandSchema,
  execute: async ({ command, args = [], sudo, detached, sandboxName }: z.infer<typeof runCommandSchema>) => {
    console.log('=== TOOL: runCommand ===');
    console.log('INPUT:', JSON.stringify({ sandboxName, command, args, sudo, detached }));

    try {
      const sandbox = await Sandbox.get({ name: sandboxName });
      const result = await sandbox.runCommand({ cmd: command, args, sudo, detached });

      let output: any;

      if (detached) {
        output = {
          success: true,
          command,
          args,
          cmdId: result.cmdId,
          message: 'Command started in background',
        };
      } else {
        const stdout = await result.stdout();
        const stderr = await result.stderr();

        output = {
          success: result.exitCode === 0,
          command,
          args,
          exitCode: result.exitCode,
          stdout,
          stderr,
        };
      }

      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to execute command: ${message}` };
    }
  },
});