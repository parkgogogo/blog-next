# Markdown Image Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render markdown images with plain `<img>` by default, while keeping `next/image` only for controlled raster attachments under `/api/attachment/`.

**Architecture:** Keep the markdown rendering pipeline unchanged except for the `img` renderer. Add a small source classifier so uncontrolled markdown image URLs bypass Next image optimization, then cover the behavior with a server-rendered regression test.

**Tech Stack:** Next.js App Router, `react-markdown`, `next/image`, Vitest, `react-dom/server`

---

### Task 1: Add regression tests for markdown image routing

**Files:**
- Create: `src/components/MarkdownRenderer.test.tsx`
- Modify: `src/components/MarkdownRenderer.tsx`

**Step 1: Write the failing test**

Add tests that verify:
- `![Test](/next.svg)` renders as a plain `<img>` without Next image markers
- `![Photo](/api/attachment/example.webp)` still renders through `next/image`

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/MarkdownRenderer.test.tsx`
Expected: FAIL because markdown images currently always use `next/image`

**Step 3: Write minimal implementation**

Add a helper in `MarkdownRenderer.tsx` that only routes `/api/attachment/` raster image paths through `next/image`, and uses plain `<img>` for every other markdown image source.

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/MarkdownRenderer.test.tsx`
Expected: PASS

**Step 5: Commit**

Run:

```bash
git add docs/plans/2026-03-08-markdown-image-rendering.md src/components/MarkdownRenderer.test.tsx src/components/MarkdownRenderer.tsx
git commit -m "fix(markdown): use plain img for uncontrolled sources"
```
