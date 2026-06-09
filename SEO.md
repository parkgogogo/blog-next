# SEO Long-Running Plan

Owner: Codex automation
Started: 2026-06-10
Primary domain: https://www.parkgogogo.me

## Objective

Improve discoverability for Park's blog posts in search engines, then stop the recurring automation once the site has stable indexing and article pages expose healthy technical SEO signals.

## Current Baseline

- Public `robots.txt` allows crawling and points to `https://www.parkgogogo.me/sitemap.xml`.
- Public `sitemap.xml` lists the home page, `/blog`, and 4 article URLs.
- Public `/blog` currently renders a generic title and description: `Parkgogogo` / `Park's personal website`.
- Public `/blog` currently uses canonical `https://www.parkgogogo.me`, which is wrong for the blog index.
- Article pages do not yet have post-specific metadata or JSON-LD on main before this branch.
- Google/Bing search visibility could not be reliably validated from local repository state; recurring checks should use public pages plus any available Search Console or search result evidence.

## First-Round Implementation

- Centralize site URL, title, author, and text cleanup helpers in `src/lib/seo.ts`.
- Add richer root metadata, Open Graph, Twitter card, RSS alternate, crawler directives, and `zh-CN` document language.
- Add `/blog` metadata, canonical URL, and Blog JSON-LD.
- Add article-level `generateMetadata`, canonical URLs, Open Graph article metadata, Twitter metadata, and BlogPosting JSON-LD.
- Mark raw markdown source views as `noindex` while canonicalizing them to the rendered article.
- Make sitemap URLs and RSS feed URLs use the shared canonical site URL.

## Recurring Review Checklist

1. Fetch `https://www.parkgogogo.me/robots.txt` and confirm it allows content crawling, disallows only non-content routes, and references the sitemap.
2. Fetch `https://www.parkgogogo.me/sitemap.xml` and confirm all published blog posts are present with canonical encoded URLs and plausible `lastmod` values.
3. Fetch `https://www.parkgogogo.me/blog` and at least the newest 3 article URLs from the sitemap. Check title, meta description, canonical, Open Graph, Twitter, and JSON-LD.
4. Check for duplicate indexable raw markdown URLs ending in `.md`; they should be `noindex` and canonicalize to the rendered article.
5. Review whether new posts have specific frontmatter `title`, useful `excerpt`, and tags when relevant.
6. If Search Console or an equivalent source is available, compare indexed pages, impressions, clicks, average position, and crawl/indexing issues against the previous run.
7. If issues are found, create a branch from `origin/main`, implement a focused fix, run `pnpm run lint` and `pnpm run typecheck`, open a PR, and merge when checks pass.
8. If the objective is met for 3 consecutive reviews, disable the SEO automation and append the stop reason here.

## Success Criteria

- `/blog` and article pages have distinct canonical URLs, titles, descriptions, and valid JSON-LD.
- Sitemap and robots remain reachable from the public domain.
- All current blog posts are present in the sitemap and have indexable rendered article pages.
- Raw markdown source pages are not competing with rendered article pages.
- Search visibility is considered acceptable after either Search Console shows stable indexed article pages and non-zero impressions/clicks, or repeated public search checks show the core article URLs indexed.

## Review Log

- 2026-06-10: Created baseline plan and first technical SEO implementation branch from `origin/main`.
