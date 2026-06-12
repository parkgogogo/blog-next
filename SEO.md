# SEO Long-Running Plan

Owner: Codex automation
Started: 2026-06-10
Primary domain: https://www.parkgogogo.me

## Objective

Improve discoverability for Park's blog posts in search engines, then stop the recurring automation once the site has stable indexing and article pages expose healthy technical SEO signals.

Active `/goal` extension: for Google search query `parkgogogo`, make `parkgogogo.me` rank in the top 3 results and keep running follow-up checks until that external ranking is verified.

## Measurement Model

Google ranking is an outcome signal, but it is too noisy to use as the only success metric. Use Google Search Console as the primary measurement source whenever available. If Search Console is unavailable, use public technical checks plus `site:` search presence as a fallback and record the limitation in the review log.

Primary KPI:

- Rolling 28-day organic Google Search clicks for `/blog` and `/blog/*`.

Brand-query KPI:

- Google result position for query `parkgogogo`, with `https://www.parkgogogo.me/` or another canonical `parkgogogo.me` URL considered successful only when it is in positions 1-3.

Supporting KPIs:

- Indexed rendered article URLs divided by article URLs listed in `sitemap.xml`.
- Rolling 28-day impressions for `/blog` and `/blog/*`.
- Rolling 28-day average position by page and by meaningful query.
- Rolling 28-day CTR for pages with at least 20 impressions.
- Count of Search Console page indexing errors, canonical mismatches, crawl errors, and structured-data errors.
- Count of public technical regressions: non-200 canonical pages, missing title/description/canonical, missing or invalid JSON-LD, missing sitemap entries, or indexable raw `.md` duplicates.

Ranking rule:

- Prefer Search Console `average position` over one-off manual Google results.
- Track rankings by page/query pair, not by site-wide averages alone.
- Exact-title queries should confirm indexability; topic queries should be used to judge real discovery.
- Do not call an SEO change successful or failed from less than 7 days of ranking data.
- Do not mark the active `/goal` complete until the current Google results for `parkgogogo` show `parkgogogo.me` in the top 3.

Cadence:

- Daily lightweight review: public technical health only. This catches regressions in robots, sitemap, metadata, canonical URLs, JSON-LD, RSS, and raw `.md` noindex behavior.
- Weekly outcome review: Search Console indexing, impressions, clicks, CTR, and average position over rolling 7-day and 28-day windows.
- Monthly content review: decide whether titles, excerpts, tags, internal links, or new posts are needed based on query/page data.

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
6. On weekly outcome reviews, compare Search Console indexed pages, impressions, clicks, CTR, average position, and crawl/indexing issues against the previous weekly run.
7. On monthly content reviews, identify pages with impressions but weak CTR, pages ranking in positions 8-30, and pages with zero impressions; use that to adjust titles, excerpts, internal links, or content coverage.
8. If issues are found, create a branch from `origin/main`, implement a focused fix, run `pnpm run lint` and `pnpm run typecheck`, open a PR, and merge when checks pass.
9. If the objective is met for 3 consecutive weekly outcome reviews, disable the SEO automation and append the stop reason here.

## Success Criteria

- `/blog` and article pages have distinct canonical URLs, titles, descriptions, and valid JSON-LD.
- Sitemap and robots remain reachable from the public domain.
- All current blog posts are present in the sitemap and have indexable rendered article pages.
- Raw markdown source pages are not competing with rendered article pages.
- Search visibility is considered acceptable after 3 consecutive weekly outcome reviews show all sitemap article URLs indexed, zero critical indexing/canonical/structured-data errors, non-zero rolling 28-day impressions for `/blog/*`, and either non-zero rolling 28-day organic clicks or clearly improving page/query average position.
- The active brand-ranking goal is complete only after a fresh Google search for `parkgogogo` verifies that a canonical `parkgogogo.me` result is ranked in the top 3.

## Review Log

- 2026-06-11: Daily public technical review found `https://www.parkgogogo.me/test.md` returning `200 text/markdown` from `public/test.md`, which created an uncontrolled crawlable raw Markdown URL. Moved the e2e fixture out of `public/`, kept the `/e2e/md` page working from an internal fixture, and fixed raw article source pages to retain the real markdown content including frontmatter.
- 2026-06-11: Public review checks passed for `robots.txt`, `sitemap.xml`, `/blog`, sampled article pages, canonical URLs, Open Graph, Twitter metadata, JSON-LD, RSS alternate link, and raw `.md` article routes staying `noindex`. Search Console data was not available in this repository, so no weekly KPI comparison was performed.
- 2026-06-10: Fixed the root canonical signal by making `/` a permanent redirect to `/blog` and removing the redirecting root URL from `sitemap.xml`.
- 2026-06-10: Created baseline plan and first technical SEO implementation branch from `origin/main`.
- 2026-06-12: Daily public review via browser found `https://www.parkgogogo.me/blog` serving the expected canonical, title, description, Open Graph, Twitter, and Blog JSON-LD signals. Environment TLS issues prevented direct `curl`/git fetches to the public domain, so `robots.txt`, `sitemap.xml`, and RSS were only partially validated this run and need a normal network retry next run.
- 2026-06-12: Bare-domain `https://parkgogogo.me/blog` resolved to a `Vercel Security Checkpoint` page instead of the blog. Treat this as a site-level SEO risk outside the app codepath until the domain/edge configuration is fixed.
- 2026-06-12: Restored RSS feed alternates on `/blog` and article pages after child-route metadata overwrote the root alternate links. Also made the `/blog` title and description more specific to improve snippet clarity and CTR.
- 2026-06-12: Public checks found `https://www.parkgogogo.me/` still 308-redirecting to `/blog`, while `https://parkgogogo.me/blog` now 307-redirects to `https://www.parkgogogo.me/blog`. Web search for `parkgogogo` surfaced GitHub/Gist and social results, but not `parkgogogo.me`, so the brand query is not yet in the top 3.
- 2026-06-12: Started `codex/seo-parkgogogo-top3-20260612` from `origin/main` to restore an indexable root brand page with `Parkgogogo`, `parkgogogo`, and `parkgogogo.me` text signals, WebSite/ProfilePage/Person JSON-LD, `rel=me` GitHub identity link, and root sitemap inclusion.
- 2026-06-12: Merged PR #119, then pushed empty commit `48f00f8` (`chore(deploy): retrigger production deployment`) after Vercel did not create a production deployment for the squash commit. Production deployment `5037620003` completed for `48f00f8`; public `https://www.parkgogogo.me/` now returns `200`, public sitemap includes `https://www.parkgogogo.me/`, and the bare domain redirects to the canonical `www` root.
- 2026-06-12: Google search for `parkgogogo` still did not show a canonical `parkgogogo.me` URL in the visible top results immediately after deployment, so the active `/goal` remains incomplete. Created public GitHub profile repository `https://github.com/parkgogogo/parkgogogo` with README, homepage, description, and topics linking to `https://www.parkgogogo.me` to strengthen the external brand/entity signal from the currently ranking GitHub surface.
