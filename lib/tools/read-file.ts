import { tool } from 'ai';
import { z } from 'zod';
import { Sandbox, FileSystem } from '@vercel/sandbox';

const readFileSchema = z.object({
  path: z
    .string()
    .describe('Workspace-relative path to the file (e.g., "src/index.ts")'),
  sandboxName: z
    .string()
    .describe('The name of the sandbox to read the file from (e.g., "sbx_xxx")'),
});

export const readFileTool = tool({
  description: `Read a file from the sandbox.

  USAGE:
  - Reads a file from the sandbox filesystem
  - Uses workspace-relative paths
  - Returns the entire file content as text

  EXAMPLES:
  - path: "src/index.ts"
  - path: "package.json"
  - path: "README.md"`,
  inputSchema: readFileSchema,
  execute: async ({ path, sandboxName }: z.infer<typeof readFileSchema>) => {
    console.log('=== TOOL: readFile ===');
    console.log('INPUT:', JSON.stringify({ sandboxName, path }));
    try {
      const sandbox = await Sandbox.get({ name: sandboxName });

      // Read file content
      const buffer = await sandbox.readFileToBuffer({
        path,
      });

      console.log('OUTPUT:', JSON.stringify({ success: true, path, contentLength: buffer?.length }));
      return {
        success: true,
        path,
        content: buffer?.toString() ?? '',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('ERROR:', message);
      return {
        success: false,
        error: `Failed to read file: ${message}`,
      };
    }
  },
});