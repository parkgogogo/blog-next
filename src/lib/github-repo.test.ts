import { describe, expect, it } from "vitest";

import {
  DEFAULT_GITHUB_REPO,
  getGitHubRepoCandidates,
  withGitHubRepoFallback,
} from "@/lib/github-repo";

describe("getGitHubRepoCandidates", () => {
  it("appends the canonical repo as a fallback for older configured names", () => {
    expect(getGitHubRepoCandidates("blog.md")).toEqual([
      "blog.md",
      DEFAULT_GITHUB_REPO,
    ]);
  });

  it("deduplicates the canonical repo", () => {
    expect(getGitHubRepoCandidates(DEFAULT_GITHUB_REPO)).toEqual([
      DEFAULT_GITHUB_REPO,
    ]);
  });
});

describe("withGitHubRepoFallback", () => {
  it("retries with the canonical repo after a 404", async () => {
    const result = await withGitHubRepoFallback(
      ["blog.md", DEFAULT_GITHUB_REPO],
      async (repo) => {
        if (repo === "blog.md") {
          const error = new Error("Not Found") as Error & { status: number };
          error.status = 404;
          throw error;
        }

        return `${repo}:ok`;
      },
    );

    expect(result).toEqual({
      repo: DEFAULT_GITHUB_REPO,
      data: `${DEFAULT_GITHUB_REPO}:ok`,
    });
  });

  it("does not swallow non-404 errors", async () => {
    await expect(
      withGitHubRepoFallback(["blog.md", DEFAULT_GITHUB_REPO], async () => {
        const error = new Error("rate limited") as Error & { status: number };
        error.status = 403;
        throw error;
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
