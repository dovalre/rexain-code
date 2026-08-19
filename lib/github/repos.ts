import "server-only";

export interface GitHubRepo {
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  clone_url: string;
  updated_at: string;
  language?: string;
  owner: {
    login: string;
  };
}

/**
 * Fetch user's repositories from GitHub API
 * Includes both personal repositories and repositories from organizations the user is a member of
 */
export async function fetchGitHubRepositories(
  token: string,
  options?: {
    org?: string;
    page?: number;
    perPage?: number;
  }
): Promise<GitHubRepo[]> {
  const { org, page = 1, perPage = 50 } = options || {};
  
  try {
    const endpoints = [];
    
    // Fetch personal repositories if no specific org is requested
    if (!org) {
      endpoints.push(
        fetch('https://api.github.com/user/repos?type=owner&sort=updated&per_page=100', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        })
      );
    }
    
    // Fetch org repositories
    if (org) {
      endpoints.push(
        fetch(`https://api.github.com/orgs/${org}/repos?per_page=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        })
      );
    } else {
      // Also fetch repos from organizations the user is a member of
      endpoints.push(
        fetch('https://api.github.com/user/orgs?per_page=100', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }).then(async (res) => {
          if (!res.ok) return null;
          const orgs = await res.json();
          
          // Fetch repos from each org
          const orgRepos = await Promise.all(
            (orgs as Array<{ login: string }>).map((org) =>
              fetch(`https://api.github.com/orgs/${org.login}/repos?per_page=100`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/vnd.github.v3+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                },
              })
                .then((res) => (res.ok ? res.json() : []))
                .catch(() => [])
            )
          );
          
          return orgRepos.flat();
        })
      );
    }

    const responses = await Promise.all(endpoints);
    const allRepos: GitHubRepo[] = [];
    
    for (const response of responses) {
      if (response instanceof Response) {
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('GitHub token is invalid or expired');
          }
          throw new Error(`GitHub API error: ${response.statusText}`);
        }
        const repos = await response.json();
        allRepos.push(...(Array.isArray(repos) ? repos : [repos]));
      } else if (Array.isArray(response)) {
        allRepos.push(...response);
      }
    }

    // Sort by updated_at and remove duplicates
    const uniqueRepos = Array.from(
      new Map(allRepos.map((r) => [r.name, r])).values()
    ).sort((a, b) => {
      const aDate = new Date(a.updated_at || 0).getTime();
      const bDate = new Date(b.updated_at || 0).getTime();
      return bDate - aDate;
    });

    return uniqueRepos;
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    throw error;
  }
}

/**
 * Fetch organizations the user is a member of
 */
export async function fetchGitHubOrganizations(
  token: string
): Promise<Array<{ login: string; avatar_url: string }>> {
  try {
    const response = await fetch('https://api.github.com/user/orgs?per_page=100', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching GitHub organizations:', error);
    throw error;
  }
}

/**
 * Create a new repository on GitHub
 */
export async function createGitHubRepository(
  token: string,
  options: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
  }
): Promise<GitHubRepo> {
  try {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: options.name,
        description: options.description || '',
        private: options.private || false,
        auto_init: options.auto_init || true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || `GitHub API error: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating GitHub repository:', error);
    throw error;
  }
}
