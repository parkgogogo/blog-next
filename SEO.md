# SEO Long-Running Plan

Owner: Codex automation
Started: 2026-06-10
Primary domain: https://www.parkgogogo.me

## Objective

Improve discoverability for Park's blog posts in search engines, then stop the recurring automation once the site has stable indexing and article pages expose healthy technical SEO signals.

## Measurement Model

Google ranking is an outcome signal, but it is too noisy to use as the only success metric. Use Google Search Console as the primary measurement source whenever available. If Search Console is unavailable, use public technical checks plus `site:` search presence as a fallback and record the limitation in the review log.

Primary KPI:

- Rolling 28-day organic Google Search clicks for `/blog` and `/blog/*`.

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

## Review Log

- 2026-06-10: Fixed the root canonical signal by making `/` a permanent redirect to `/blog` and removing the redirecting root URL from `sitemap.xml`.
- 2026-06-10: Created baseline plan and first technical SEO implementation branch from `origin/main`.
