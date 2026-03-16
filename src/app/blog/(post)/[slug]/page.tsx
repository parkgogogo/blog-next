import { notFound } from "next/navigation";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { formatDateLabel } from "@/lib/date";
import { PostService } from "@/lib/posts";

export const revalidate = 300;

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const decodedSlug = decodeURIComponent(rawSlug);
  const isRawMarkdownMode = decodedSlug.endsWith(".md");
  const slug = isRawMarkdownMode ? decodedSlug.slice(0, -3) : decodedSlug;
  const post = await PostService.getPostBySlug(slug);
  const formattedDate = formatDateLabel(post?.date);

  if (!post) {
    notFound();
  }

  if (isRawMarkdownMode) {
    const rawMarkdown = await PostService.getRawMarkdownBySlug(slug);

    if (!rawMarkdown) {
      notFound();
    }

    return (
      <div className="max-w-4xl mx-auto px-6 md:px-8 pt-6 pb-14 md:pb-20 animate-fade-in-up-slow">
        <article className="bg-transparent">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-medium font-display text-[color:var(--foreground-strong)] mb-2 leading-tight tracking-tight mt-0 break-words">
              {post.title}.md
            </h1>
            <p className="text-sm text-[color:var(--text-muted)]">
              Raw Markdown Source
            </p>
          </header>

          <pre className="overflow-x-auto rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--background)] p-4 md:p-5 text-sm leading-7 whitespace-pre-wrap break-words">
            <code>{rawMarkdown}</code>
          </pre>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-8 pt-6 pb-14 md:pb-20 animate-fade-in-up-slow">
      <article className="bg-transparent">
        <div className="px-0 py-0">
          {/* Post Header */}
          <header className="mb-8 md:mb-12">
            <h1 className="text-3xl font-medium font-display text-[color:var(--foreground-strong)] mb-4 leading-tight tracking-tight mt-0 break-words">
              {post.title}
            </h1>

            <div className="flex flex-row items-center gap-2 text-[color:var(--text-muted)]">
              {formattedDate && <time>{formattedDate}</time>}
              {post.readingTime !== undefined && post.readingTime > 0 && (
                <>
                  {formattedDate && <span>·</span>}
                  <span>{post.readingTime} min read</span>
                </>
              )}
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="inline-block border border-[color:var(--border-subtle)] bg-[color:var(--background)] text-[color:var(--text-muted)] text-xs font-medium px-3 py-1 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Post Content */}
          <div className="mt-6 md:mt-8">
            <MarkdownRenderer content={post.content} />
          </div>
        </div>
      </article>
    </div>
  );
}
