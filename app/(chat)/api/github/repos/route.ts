import { getSession } from '@/lib/db/queries';
import { getUserGitHubToken } from '@/lib/github/token';
import { fetchGitHubRepositories, createGitHubRepository } from '@/lib/github/repos';

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
        JSON.stringify({ error: 'GitHub not connected' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const { name, description, private: isPrivate, auto_init } = body;

    if (!name || !name.trim()) {
      return new Response(
        JSON.stringify({ error: 'Repository name is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const repo = await createGitHubRepository(token, {
      name: name.trim(),
      description: description || '',
      private: isPrivate ?? false,
      auto_init: auto_init ?? true,
    });

    return new Response(JSON.stringify({ repository: repo }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating repository:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create repository',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function GET(req: Request) {
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
          error: 'GitHub not connected',
          repositories: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const url = new URL(req.url);
    const org = url.searchParams.get('org');

    const repositories = await fetchGitHubRepositories(token, {
      org: org || undefined,
    });

    return new Response(JSON.stringify({ repositories }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch repositories',
        repositories: [],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
