import { getSession } from '@/lib/db/queries';
import { getUserGitHubToken } from '@/lib/github/token';
import { commitAndPushSandbox } from '@/lib/github/commit';

export async function POST(req: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = await getUserGitHubToken(session.user.id);

    if (!token) {
      return new Response(
        JSON.stringify({
          error: 'GitHub not connected. Please sign in with GitHub first.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const { sandboxName, commitMessage, repoUrl } = body;

    if (!sandboxName) {
      return new Response(
        JSON.stringify({ error: 'sandboxName is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!commitMessage || !commitMessage.trim()) {
      return new Response(
        JSON.stringify({ error: 'commitMessage is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await commitAndPushSandbox(
      sandboxName,
      commitMessage.trim(),
      token,
      repoUrl,
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error committing and pushing:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to commit and push',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}