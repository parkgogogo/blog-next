import TableOfContents from "@/components/TableOfContents";
import { formatLongDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown/render";
import type { BlogPost } from "@/types/blog";

export default async function PostArticle({ post }: { post: BlogPost }) {
  const { content, toc } = await renderMarkdown(post.content);

  return (
    <article className="post">
      <header className="post-header">
        <p className="post-meta">
          <time dateTime={post.date}>{formatLongDate(post.date)}</time>
          {post.category && <span>{post.category}</span>}
          {post.readingTime ? <span>{post.readingTime} min read</span> : null}
        </p>
        <h1 className="post-title">{post.title}</h1>
        {post.subtitle && <p className="post-subtitle">{post.subtitle}</p>}
        {post.links && post.links.length > 0 && (
          <div className="post-actions">
            {post.links.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                className={index === 0 ? "pill pill--primary" : "pill"}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        )}
      </header>

      {post.cover && (
        <figure className="post-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover} alt="" />
        </figure>
      )}

      <div className="post-body">
        {toc.length > 1 && (
          <aside className="post-toc">
            <TableOfContents items={toc} />
          </aside>
        )}
        {content}
      </div>
    </article>
  );
}
