# Article Layout Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the left and right sidebars from blog post detail pages and unify the site background to pure white in light mode and pure black in dark mode.

**Architecture:** Keep the existing blog list layout intact and narrow the change to the post-detail layout shell plus global theme variables. Cover the behavior with a focused layout render test and a CSS regression test so the visual simplification remains intentional.

**Tech Stack:** Next.js App Router, React 19, Tailwind utility classes, global CSS variables, Vitest

---

### Task 1: Lock the intended layout and theme behavior with tests

**Files:**
- Create: `src/components/BlogPostLayout.test.tsx`
- Create: `src/app/globals.test.ts`
- Modify: `src/components/BlogPostLayout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Write the failing test**

Add a render test for `BlogPostLayout` that expects article detail pages to render only the content shell and no sidebar or TOC labels. Add a CSS regression test that expects the light-mode background token to be `#ffffff` and the dark-mode background token to be `#000000`.

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/BlogPostLayout.test.tsx src/app/globals.test.ts`
Expected: FAIL because the current layout still renders sidebar structure and the light/dark background tokens do not match the new values.

**Step 3: Write minimal implementation**

Simplify `BlogPostLayout` to a single-column shell for article detail pages. Update `src/app/globals.css` so the global light background is pure white and the dark theme background surfaces use pure black.

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/BlogPostLayout.test.tsx src/app/globals.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add docs/plans/2026-03-11-article-layout-simplification.md src/components/BlogPostLayout.test.tsx src/app/globals.test.ts src/components/BlogPostLayout.tsx src/app/globals.css
git commit -m "feat: simplify article layout theme"
```

### Task 2: Verify the workspace stays healthy

**Files:**
- Verify: `src/components/BlogPostLayout.tsx`
- Verify: `src/app/globals.css`

**Step 1: Run focused tests**

Run: `pnpm test -- src/components/BlogPostLayout.test.tsx src/app/globals.test.ts`
Expected: PASS

**Step 2: Run project verification**

Run: `pnpm run lint`
Expected: exit 0

**Step 3: Run type checking**

Run: `pnpm run typecheck`
Expected: exit 0

**Step 4: Commit verified changes**

```bash
git add docs/plans/2026-03-11-article-layout-simplification.md src/components/BlogPostLayout.test.tsx src/app/globals.test.ts src/components/BlogPostLayout.tsx src/app/globals.css
git commit -m "feat: simplify article layout theme"
```
