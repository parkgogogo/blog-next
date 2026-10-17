import Link from "next/link";
import TableOfContents from "@/components/TableOfContents";
import { formatLongDate } from "@/lib/format";
import { LANGUAGE_INFO, type PostLanguage } from "@/lib/i18n";
import { renderMarkdown } from "@/lib/markdown/render";
import type { BlogPost } from "@/types/blog";

export interface PostLanguageLink {
  lang: PostLanguage;
  href: string;
  current: boolean;
}

export default async function PostArticle({
  post,
  versions,
}: {
  post: BlogPost;
  /** 有多个语言版本时才传，用于语言切换 */
  versions?: PostLanguageLink[];
}) {
  const { content, toc } = await renderMarkdown(post.content);

  return (
    <article className="post" lang={LANGUAGE_INFO[post.lang].hreflang}>
      <header className="post-header">
        <p className="post-meta">
          <time dateTime={post.date}>{formatLongDate(post.date)}</time>
          {post.category && <span>{post.category}</span>}
          {post.readingTime ? <span>{post.readingTime} min read</span> : null}
        </p>
        {versions && (
          <nav className="post-langs" aria-label="Language">
            {versions.map((version) =>
              version.current ? (
                <span key={version.lang} aria-current="page" lang={LANGUAGE_INFO[version.lang].hreflang}>
                  {LANGUAGE_INFO[version.lang].label}
                </span>
              ) : (
                <Link
                  key={version.lang}
                  href={version.href}
                  hrefLang={LANGUAGE_INFO[version.lang].hreflang}
                  lang={LANGUAGE_INFO[version.lang].hreflang}
                >
                  {LANGUAGE_INFO[version.lang].label}
                </Link>
              )
            )}
          </nav>
        )}
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
