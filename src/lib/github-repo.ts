export const DEFAULT_GITHUB_REPO = "blogs-md";

type GitHubError = Error & {
  status?: number;
};

export function getGitHubRepoCandidates(configuredRepo?: string): string[] {
  return [
    ...new Set(
      [configuredRepo, DEFAULT_GITHUB_REPO].filter(
        (repo): repo is string => Boolean(repo),
      ),
    ),
  ];
}

export async function withGitHubRepoFallback<T>(
  repos: string[],
  runner: (repo: string) => Promise<T>,
): Promise<{ repo: string; data: T }> {
  let lastNotFoundError: GitHubError | undefined;

  for (const repo of repos) {
    try {
      return {
        repo,
        data: await runner(repo),
      };
    } catch (error) {
      const githubError = error as GitHubError;
      if (githubError.status === 404) {
        lastNotFoundError = githubError;
        continue;
      }

      throw error;
    }
  }

  if (lastNotFoundError) {
    throw lastNotFoundError;
  }

  throw new Error("No GitHub repository candidates configured");
}
