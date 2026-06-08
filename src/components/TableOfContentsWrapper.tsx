"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TableOfContentsItem } from "@/types/blog";

export default function TableOfContentsWrapper() {
  const pathname = usePathname();
  const [tocItems, setTocItems] = useState<TableOfContentsItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;
    setTocItems([]);
    setActiveId("");

    // Wait for the content to be rendered in the DOM
    const timer = setTimeout(() => {
      try {
        // Find headings in the actual DOM
        const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");

        const items: TableOfContentsItem[] = [];

        headings.forEach((heading, index) => {
          const level = parseInt(heading.tagName.charAt(1));
          const title = heading.textContent?.trim() || "";

          if (title && heading.closest(".prose")) {
            const id = `heading-${index}`;

            // Set ID on the heading element
            heading.id = id;

            items.push({
              id: id,
              title,
              level,
            });
          }
        });

        setTocItems(items);
      } catch (error) {
        console.error("Error generating TOC:", error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (tocItems.length === 0) return;

    // Set up intersection observer to track active heading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20px 0px -80% 0px",
      }
    );

    // Observe all headings with IDs
    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [tocItems]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  if (tocItems.length === 0) {
    return (
      <div className="sticky top-16 h-[calc(100vh-4rem)] w-60 overflow-y-auto bg-[color:var(--background)]">
        <div className="p-4">
          <h3 className="mb-4 px-3 text-sm font-semibold leading-5 text-[color:var(--foreground-strong)]">
            On This Page
          </h3>
          <div className="px-3 text-sm leading-5 text-[color:var(--text-tertiary)]">
            No headings found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-16 h-[calc(100vh-4rem)] w-60 overflow-y-auto bg-[color:var(--background)]">
      <div className="p-4">
        <h3 className="mb-4 px-3 text-sm font-semibold leading-5 text-[color:var(--foreground-strong)]">
          On This Page
        </h3>

        <nav className="space-y-0.5">
          {tocItems.map((item) => {
            const isActive = activeId === item.id;
            const indentClass =
              item.level > 1 ? `ml-${(item.level - 1) * 3}` : "";

            return (
              <button
                key={item.id}
                onClick={() => scrollToHeading(item.id)}
                className={`
                  block w-full rounded-md px-3 py-2 text-left text-sm leading-5 transition-colors duration-150
                  ${indentClass}
                  ${
                    isActive
                      ? "bg-[color:var(--surface-active)] font-medium text-[color:var(--foreground-strong)]"
                      : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-tertiary)] hover:text-[color:var(--foreground-strong)]"
                  }
                `}
              >
                {item.title}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
