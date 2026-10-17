"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface PostListItem {
  slug: string;
  href: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  dateLabel: string;
  /** 有多个语言版本时的语言简写，如 ["ZH", "EN"] */
  languages?: string[];
}

const ALL = "All";

export default function PostList({ posts }: { posts: PostListItem[] }) {
  const [active, setActive] = useState(ALL);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      if (post.category) counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [posts]);

  const visible = active === ALL ? posts : posts.filter((post) => post.category === active);

  return (
    <>
      {categories.length > 1 && (
        <div className="post-filter" role="tablist" aria-label="Filter by category">
          {[ALL, ...categories].map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={active === name}
              onClick={() => setActive(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="post-list__empty">No posts yet.</p>
      ) : (
        <ul className="post-list">
          {visible.map((post) => (
            <li key={post.slug}>
              <Link href={post.href} className="post-row">
                <span className="post-row__title">{post.title}</span>
                {post.excerpt && <span className="post-row__excerpt">{post.excerpt}</span>}
                <span className="post-row__meta">
                  <time dateTime={post.date}>{post.dateLabel}</time>
                  {post.category && <span>{post.category}</span>}
                  {post.languages && <span>{post.languages.join(" / ")}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
