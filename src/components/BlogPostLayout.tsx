"use client";

import { ReactNode, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import CategorySidebarServer from "@/components/CategorySidebarServer";
import MobileCategorySidebar from "@/components/MobileCategorySidebar";
import TableOfContentsWrapper from "@/components/TableOfContentsWrapper";
import { Category } from "@/types/blog";

interface BlogPostLayoutProps {
  children: ReactNode;
  categories: Category;
}

export default function BlogPostLayout({
  children,
  categories,
}: BlogPostLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const currentSlug = useMemo(() => {
    if (!pathname.startsWith("/blog/")) {
      return undefined;
    }
    return decodeURIComponent(pathname.replace("/blog/", ""));
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="p-2 rounded-md text-muted hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 fixed right-4 top-4 flex md:hidden"
        title="Menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </div>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black opacity-50"
              onClick={() => setIsSidebarOpen(false)}
            ></div>
            <div className="relative w-64 h-full bg-background">
              <MobileCategorySidebar
                categories={categories}
                currentSlug={currentSlug}
                onItemClick={() => setIsSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Mobile TOC Overlay */}
        {isTocOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black opacity-50"
              onClick={() => setIsTocOpen(false)}
            ></div>
            <div className="relative w-64 h-full bg-background ml-auto">
              <TableOfContentsWrapper />
            </div>
          </div>
        )}

        {/* Desktop Left Sidebar */}
        {/* Desktop Left Sidebar */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <CategorySidebarServer
            categories={categories}
            currentSlug={currentSlug}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 bg-background">{children}</div>

        {/* Desktop Right Sidebar - Table of Contents */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <TableOfContentsWrapper />
        </div>
      </div>
    </div>
  );
}
