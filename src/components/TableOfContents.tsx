"use client";

import { useEffect, useState } from "react";
import type { TableOfContentsItem } from "@/types/blog";

export default function TableOfContents({ items }: { items: TableOfContentsItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    // 取视口上方最近越过的标题作为当前小节
    const update = () => {
      const threshold = window.innerHeight * 0.25;
      let current: string | null = null;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= threshold) current = heading.id;
        else break;
      }
      setActiveId(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [items]);

  return (
    <nav aria-label="On this page" className="toc">
      <ul>
        {items.map((item) => (
          <li key={item.id} data-level={item.level}>
            <a
              href={`#${item.id}`}
              aria-current={activeId === item.id ? "location" : undefined}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
