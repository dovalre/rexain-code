import { tool } from 'ai';
import { z } from 'zod';
import { Sandbox } from '@vercel/sandbox';

const gitSourceSchema = z.object({
  url: z.string().describe('Git repository URL'),
  type: z.literal('git').describe('Source type (always "git")'),
  username: z.string().describe('Username for authentication (e.g. "x-access-token")'),
  password: z.string().describe('Password or token for authentication'),
});

const createSandboxSchema = z.object({
  runtime: z
    .enum(['node24', 'node22', 'node26', 'python3.13'])
    .optional()
    .default('node24')
    .describe('Runtime for the sandbox (node24, node22, node26, or python3.13)'),
  ports: z
    .array(z.number())
    .optional()
    .describe('Ports to expose from the sandbox (up to 4 ports)'),
  env: z
    .record(z.string(), z.string())
    .optional()
    .describe('Environment variables to set in the sandbox'),
  timeout: z
    .number()
    .optional()
    .describe('Timeout in milliseconds before sandbox auto-terminates'),
  source: gitSourceSchema.optional().describe('Git source to clone into the sandbox on creation'),
});

export const createSandboxTool = tool({
  description: `Create a new sandbox instance for running code.

  USAGE:
  - Creates a fresh isolated sandbox with the specified runtime
  - Runtimes: node24 (default), node22, node26, python3.13
  - Can expose ports and set environment variables
  - Can clone a git repository as the source
  - Returns sandbox configuration details

  IMPORTANT:
  - Each sandbox is isolated and temporary
  - Sandboxes can be managed using Vercel Sandbox APIs
  - Maximum 4 ports can be exposed
  - Use the appropriate runtime for your workload
  - If source is provided, the sandbox will clone that repo before starting
  - For PRIVATE repositories, you MUST include username and password in the source object

  EXAMPLES:
  - Create a Node.js sandbox: runtime: "node24"
  - Create a Python sandbox: runtime: "python3.13"
  - Create with ports and env:
    runtime: "node24",
    ports: [3000, 5000],
    env: { "API_KEY": "secret" }
  - Create with git source (public repo):
    runtime: "node24",
    source: { url: "https://github.com/owner/repo.git", type: "git"}
  - Create with git source (private repo - MUST include username and password):
    runtime: "node24",
    source: { url: "https://github.com/owner/private-repo.git", type: "git", username: "x-access-token", password: "ghp_xxx" }`,
  inputSchema: createSandboxSchema,
  execute: async ({ runtime = 'node24', ports = [3000], env = {}, timeout = 600000, source }: z.infer<typeof createSandboxSchema>) => {
    console.log('=== TOOL: createSandbox ===');
    console.log('INPUT:', JSON.stringify({ runtime, ports, env, timeout, source: source ? { url: source.url, type: source.type, username: source.username, password: source.password ? '[REDACTED]' : '(empty)' } : undefined }));
    try {
      // Build the source object for the Sandbox API with credentials
      const sandboxSource = source
        ? {
            url: source.url,
            type: source.type as 'git',
            username: source.username,
            password: source.password,
          }
        : undefined;

      // Create sandbox with specified runtime and configuration
      const sandbox = await Sandbox.create({
        runtime,
        ports,
        env,
        timeout,
        source: sandboxSource,
      });

      const sandboxName = sandbox.name;

      console.log('OUTPUT:', JSON.stringify({ success: true, sandboxName, runtime, ports, hasSource: !!sandboxSource }));
      return {
        success: true,
        runtime,
        ports,
        sandboxName,
        sourceUrl: source?.url || null,
        message: `Successfully created ${runtime} sandbox${sandboxSource ? ' with source repository' : ''}`,
        timeout,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('ERROR:', message);
      return {
        success: false,
        error: `Failed to create sandbox: ${message}`,
      };
    }
  },
});