"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { CardSlashProvider } from "@/components/digi/CardSlash";
import { DigiLogo } from "@/components/digi/DigiLogo";
import { EvolutionGauge } from "@/components/digi/EvolutionGauge";
import { siteSameAs } from "@/lib/seo";
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
          aria-current={isAllPosts ? "page" : undefined}
          className="digi-nav-item"
        >
          ALL CARDS
        </Link>
      </div>

      <div>
        <p className="mb-3 px-3 font-hud text-[0.7rem] font-bold tracking-[0.3em] text-[color:var(--accent-2)]">
          DATA INDEX
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
          <h3 className="px-3 text-[0.8rem] font-bold text-[color:var(--text-tertiary)]">
            {category.name}
          </h3>
        </div>
      )}

      {hasPosts && (
        <div className="space-y-0.5">
          {category.posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              onClick={onNavigate}
              style={postIndentStyle}
              aria-current={currentSlug === post.slug ? "page" : undefined}
              className="digi-nav-item"
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
    <div className="blog-doc-shell digi-screen min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <header className="digi-topbar fixed inset-x-0 top-0 z-40 h-16">
        <div className="flex h-full items-center px-4 md:px-6">
          <DigiLogo />

          <nav
            aria-label="Primary"
            className="ml-auto hidden items-center gap-3 md:flex"
          >
            <Link
              href="/blog"
              className={`digi-chip ${pathname === "/blog" ? "is-active" : ""}`}
            >
              Blog
            </Link>
            <a
              href={siteSameAs[0]}
              rel="me noreferrer"
              className="digi-chip"
            >
              GitHub
            </a>
            <Link
              href="/rss/blog.xml"
              className="digi-chip"
            >
              RSS
            </Link>
          </nav>

          <div className="ml-auto flex items-center md:hidden">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors duration-150 hover:text-[color:var(--foreground-strong)]"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      {currentSlug && <EvolutionGauge />}

      {showSidebar && (
        <aside className="digi-sidebar fixed bottom-0 left-0 top-16 hidden w-60 md:block">
          <div className="h-full overflow-y-auto px-4 py-8">
            <BlogNavigation
              categories={categories}
              currentSlug={currentSlug}
              pathname={pathname}
            />
          </div>
        </aside>
      )}

      <main className={`relative min-h-screen pt-16 ${showSidebar ? "md:pl-60" : ""}`}>
        <CardSlashProvider>{children}</CardSlashProvider>
      </main>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-[color:var(--overlay-muted)]"
          />
          <div className="digi-drawer absolute left-0 top-0 flex h-full w-[min(320px,86vw)] flex-col border-r border-[color:var(--border-default)] bg-[color:var(--background)]">
            <div className="flex h-16 items-center justify-between border-b border-[color:var(--border-default)] px-4">
              <DigiLogo onNavigate={() => setMenuOpen(false)} />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors duration-150 hover:text-[color:var(--foreground-strong)]"
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
