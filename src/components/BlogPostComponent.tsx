import { format } from "date-fns";
import Link from "next/link";
import { BlogPost } from "@/types/blog";
import MarkdownRenderer from "./MarkdownRenderer";

interface BlogPostComponentProps {
  post: BlogPost;
  showFullContent?: boolean;
}

function getDisplayExcerpt(post: BlogPost): string {
  const source = post.excerpt || post.content;

  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[#*_>~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function BlogPostComponent({
  post,
  showFullContent = false,
}: BlogPostComponentProps) {
  const formattedDate = format(new Date(post.date), "MMMM d, yyyy");

  return (
    <article className="rounded-[10px] border border-[color:var(--border-default)] bg-[color:var(--background)] transition-colors duration-150 hover:bg-[color:var(--surface-muted)]">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <time className="text-sm leading-5 text-[color:var(--text-tertiary)]">
            {formattedDate}
          </time>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-2.5 py-1 text-xs font-medium leading-[18px] text-[color:var(--text-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <h2 className="mb-4 text-base font-semibold leading-6 text-[color:var(--foreground-strong)]">
          {post.title}
        </h2>

        {showFullContent ? (
          <MarkdownRenderer content={post.content} />
        ) : (
          <div className="mb-4">
            <p className="text-sm leading-5 text-[color:var(--text-muted)]">
              {getDisplayExcerpt(post)}
            </p>
          </div>
        )}

        {!showFullContent && (
          <div className="mt-4 flex items-center justify-between">
            <Link
              href={`/blog/${post.slug}`}
              className="inline-flex items-center text-sm font-medium leading-5 text-[color:var(--link-primary)] transition-colors duration-150 hover:text-[color:var(--link-primary-hover)]"
            >
              Read more
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
