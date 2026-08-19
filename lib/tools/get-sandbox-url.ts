import { tool } from 'ai';
import { z } from 'zod';
import { Sandbox } from '@vercel/sandbox';

const getSandboxUrlSchema = z.object({
  port: z
    .number()
    .optional()
    .default(3000)
    .describe('The port the application is running on (default: 3000)'),
  sandboxName: z
    .string()
    .describe('The name of the sandbox to read the file from (e.g., "sbx_xxx")'),
});

export const getSandboxUrlTool = tool({
  description: `Get the public URL for a running sandbox.

  USAGE:
  - Returns the accessible URL for the sandbox environment
  - Default port is 3000 (common for Next.js, Vite)
  - URL format: https://sandbox-name.vercel.sh

  EXAMPLES:
  - Get default URL: sandboxName: "abc123"
  - Custom port: sandboxName: "abc123", port: 8000`,
  inputSchema: getSandboxUrlSchema,
  execute: async ({ sandboxName, port = 3000 }: z.infer<typeof getSandboxUrlSchema>) => {
    console.log('=== TOOL: getSandboxUrl ===');
    console.log('INPUT:', JSON.stringify({ sandboxName, port }));
    try {
      // Verify sandbox exists and get its details
      const sandbox = await Sandbox.get({ name: sandboxName });

      // Get the domain for the specific port using the sandbox.domain() method
      const url = sandbox.domain(port);

      console.log('OUTPUT:', JSON.stringify({ success: true, sandboxName, port, previewUrl: url }));
      return {
        success: true,
        sandboxName,
        port,
        previewUrl: url,
        message: `Sandbox URL retrieved successfully`,
        sandboxStatus: sandbox.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('ERROR:', message);
      return {
        success: false,
        error: `Failed to get sandbox URL: ${message}`,
      };
    }
  },
});