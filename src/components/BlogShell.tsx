"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { Category } from "@/types/blog";

interface BlogShellProps {
  categories: Category;
  children: React.ReactNode;
}

function getCurrentSlug(pathname: string): string | undefined {
  const match = pathname.match(/^\/blog\/([^/?#]+)/);
  const rawSlug = match?.[1];

  if (!rawSlug) {
    return undefined;
  }

  const decodedSlug = decodeURIComponent(rawSlug);
  return decodedSlug.endsWith(".md") ? decodedSlug.slice(0, -3) : decodedSlug;
}

function BlogNavigation({
  categories,
  currentSlug,
  pathname,
  onNavigate,
}: {
  categories: Category;
  currentSlug?: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isAllPosts = pathname === "/blog";

  return (
    <nav aria-label="Blog posts" className="space-y-5">
      <div>
        <Link
          href="/blog"
          onClick={onNavigate}
          className={`block rounded-md px-3 py-2 text-sm leading-5 transition-colors duration-150 ${
            isAllPosts
              ? "bg-[color:var(--surface-active)] font-medium text-[color:var(--foreground-strong)]"
              : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-tertiary)] hover:text-[color:var(--foreground-strong)]"
          }`}
        >
          All posts
        </Link>
      </div>

      <div>
        <p className="mb-2 px-3 text-sm font-semibold leading-5 text-[color:var(--foreground-strong)]">
          Posts
        </p>
        <CategoryTree
          category={categories}
          currentSlug={currentSlug}
          onNavigate={onNavigate}
        />
      </div>
    </nav>
  );
}

function CategoryTree({
  category,
  currentSlug,
  onNavigate,
  level = 0,
}: {
  category: Category;
  currentSlug?: string;
  onNavigate?: () => void;
  level?: number;
}) {
  const hasSubcategories =
    category.subcategories && category.subcategories.length > 0;
  const hasPosts = category.posts && category.posts.length > 0;
  const showCategoryHeader = level > 0 && category.name !== "docs";
  const categoryIndentStyle =
    level > 1 ? { paddingLeft: `${(level - 1) * 12}px` } : undefined;
  const postIndentStyle =
    level > 0 ? { paddingLeft: `${level * 12 + 12}px` } : undefined;

  return (
    <div>
      {showCategoryHeader && (
        <div className="py-1.5" style={categoryIndentStyle}>
          <h3 className="px-3 text-sm font-semibold leading-5 text-[color:var(--foreground-strong)]">
            {category.name}
          </h3>
        </div>
      )}

      {hasPosts && (
        <div className="space-y-1">
          {category.posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              onClick={onNavigate}
              style={postIndentStyle}
              className={`block rounded-md px-3 py-2 text-sm leading-5 transition-colors duration-150 ${
                currentSlug === post.slug
                  ? "bg-[color:var(--surface-active)] font-medium text-[color:var(--foreground-strong)]"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-tertiary)] hover:text-[color:var(--foreground-strong)]"
              }`}
            >
              {post.title}
            </Link>
          ))}
        </div>
      )}

      {hasSubcategories && (
        <div className="mt-2">
          {category.subcategories!.map((subcategory) => (
            <CategoryTree
              key={subcategory.path}
              category={subcategory}
              currentSlug={currentSlug}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlogShell({ categories, children }: BlogShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentSlug = useMemo(() => getCurrentSlug(pathname), [pathname]);
  const showSidebar = pathname !== "/blog";

  return (
    <div className="blog-doc-shell min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-[color:var(--border-subtle)] bg-[color:var(--background)]/95 backdrop-blur">
        <div className="flex h-full items-center px-4 md:px-6">
          <Link
            href="/"
            className="flex h-9 w-40 items-center text-[color:var(--foreground-strong)] md:w-[100px]"
          >
            <Logo className="h-8 w-auto text-[color:var(--foreground-strong)]" />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 text-sm leading-5 md:flex"
          >
            <Link
              href="/blog"
              className="rounded-full bg-[color:var(--surface-active)] px-3 py-2 font-medium text-[color:var(--foreground-strong)]"
            >
              Blog
            </Link>
          </nav>

          <div className="ml-auto flex items-center">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors duration-150 hover:bg-[color:var(--surface-tertiary)] hover:text-[color:var(--foreground-strong)] md:hidden"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {showSidebar && (
        <aside className="fixed bottom-0 left-0 top-16 hidden w-60 border-r border-[color:var(--border-subtle)] bg-[color:var(--background)] md:block">
          <div className="h-full overflow-y-auto px-4 py-5">
            <BlogNavigation
              categories={categories}
              currentSlug={currentSlug}
              pathname={pathname}
            />
          </div>
        </aside>
      )}

      <main className={`min-h-screen pt-16 ${showSidebar ? "md:pl-60" : ""}`}>
        {children}
      </main>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-[color:var(--overlay-muted)]"
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(320px,86vw)] flex-col border-r border-[color:var(--border-subtle)] bg-[color:var(--background)]">
            <div className="flex h-16 items-center justify-between border-b border-[color:var(--border-subtle)] px-4">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 items-center text-[color:var(--foreground-strong)]"
              >
                <Logo className="h-8 w-auto text-[color:var(--foreground-strong)]" />
              </Link>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors duration-150 hover:bg-[color:var(--surface-tertiary)] hover:text-[color:var(--foreground-strong)]"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <BlogNavigation
                categories={categories}
                currentSlug={currentSlug}
                pathname={pathname}
                onNavigate={() => setMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
