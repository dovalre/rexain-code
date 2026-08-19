import "server-only";
import { Sandbox } from "@vercel/sandbox";

export interface CommitResult {
  success: boolean;
  message: string;
  stdout?: string;
  stderr?: string;
}

/**
 * Commit and push changes from a sandbox to a GitHub repository.
 *
 * This runs git commands inside the sandbox:
 *   1. git add -A
 *   2. git commit -m "<message>"
 *   3. git push
 *
 * The sandbox must already have the repository cloned (via source on creation).
 * The token is injected as a credential helper so git push can authenticate.
 */
export async function commitAndPushSandbox(
  sandboxName: string,
  commitMessage: string,
  token: string,
  repoUrl?: string,
): Promise<CommitResult> {
  try {
    const sandbox = await Sandbox.get({ name: sandboxName });

    // 1. Configure git user (required for commit)
    const configName = await sandbox.runCommand({
      cmd: "git",
      args: ["config", "user.name", "Rexain Code Agent"],
      sudo: false,
      detached: false,
    });
    if (configName.exitCode !== 0) {
      const stderr = await configName.stderr();
      return { success: false, message: `Failed to set git user.name: ${stderr}` };
    }

    const configEmail = await sandbox.runCommand({
      cmd: "git",
      args: ["config", "user.email", "agent@rexain-code.app"],
      sudo: false,
      detached: false,
    });
    if (configEmail.exitCode !== 0) {
      const stderr = await configEmail.stderr();
      return { success: false, message: `Failed to set git user.email: ${stderr}` };
    }

    // 2. Configure credential helper to use the token
    //    Format: https://x-access-token:TOKEN@github.com
    if (repoUrl) {
      // Extract the host and path from the repo URL
      let repoHost = "github.com";
      let repoPath = "";
      try {
        const url = new URL(repoUrl);
        repoHost = url.host;
        repoPath = url.pathname.replace(/\.git$/, "");
      } catch {
        // fallback to github.com
      }

      const credentialHelper = await sandbox.runCommand({
        cmd: "git",
        args: [
          "config",
          "credential.helper",
          `!f() { echo "username=x-access-token"; echo "password=${token}"; }; f`,
        ],
        sudo: false,
        detached: false,
      });
      if (credentialHelper.exitCode !== 0) {
        const stderr = await credentialHelper.stderr();
        return { success: false, message: `Failed to set credential helper: ${stderr}` };
      }
    }

    // 3. git add -A (stage all changes)
    const addResult = await sandbox.runCommand({
      cmd: "git",
      args: ["add", "-A"],
      sudo: false,
      detached: false,
    });
    if (addResult.exitCode !== 0) {
      const stderr = await addResult.stderr();
      return { success: false, message: `Failed to stage changes: ${stderr}` };
    }

    // 4. Check if there's anything to commit
    const statusResult = await sandbox.runCommand({
      cmd: "git",
      args: ["status", "--porcelain"],
      sudo: false,
      detached: false,
    });
    const statusStdout = await statusResult.stdout();
    if (!statusStdout.trim()) {
      return { success: false, message: "No changes to commit. The working tree is clean." };
    }

    // 5. git commit
    const commitResult = await sandbox.runCommand({
      cmd: "git",
      args: ["commit", "-m", commitMessage],
      sudo: false,
      detached: false,
    });
    const commitStdout = await commitResult.stdout();
    const commitStderr = await commitResult.stderr();

    if (commitResult.exitCode !== 0) {
      return {
        success: false,
        message: `Failed to commit: ${commitStderr || commitStdout}`,
        stdout: commitStdout,
        stderr: commitStderr,
      };
    }

    // 6. git push
    const pushResult = await sandbox.runCommand({
      cmd: "git",
      args: ["push"],
      sudo: false,
      detached: false,
    });
    const pushStdout = await pushResult.stdout();
    const pushStderr = await pushResult.stderr();

    if (pushResult.exitCode !== 0) {
      return {
        success: false,
        message: `Failed to push: ${pushStderr || pushStdout}`,
        stdout: pushStdout,
        stderr: pushStderr,
      };
    }

    return {
      success: true,
      message: `Changes committed and pushed successfully.`,
      stdout: commitStdout + "\n" + pushStdout,
      stderr: "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to commit and push: ${message}` };
  }
}