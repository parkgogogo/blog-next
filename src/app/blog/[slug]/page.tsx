import { notFound } from "next/navigation";
import { format } from "date-fns";
import BlogPostLayout from "@/components/BlogPostLayout";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { PostService } from "@/lib/posts";

export async function generateStaticParams() {
  const slugs = await PostService.getSlugs();
  return slugs.map((slug) => ({ slug: slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const decodedSlug = decodeURIComponent(rawSlug);
  const isRawMarkdownMode = decodedSlug.endsWith(".md");
  const slug = isRawMarkdownMode
    ? decodedSlug.slice(0, -3)
    : decodedSlug;

  const [post, categories] = await Promise.all([
    (async () =>
      (await PostService.getAllPosts()).find((post) => post.slug === slug))(),
    PostService.getCategory(),
  ]);

  if (!post) {
    notFound();
  }

  if (isRawMarkdownMode) {
    const rawMarkdown = await PostService.getRawMarkdownBySlug(slug);

    if (!rawMarkdown) {
      notFound();
    }

    return (
      <BlogPostLayout
        categories={categories}
        currentSlug={slug}
        content={post.content}
      >
        <div className="max-w-4xl mx-auto px-6 md:px-8 pt-6 pb-14 md:pb-20 animate-fade-in-up-slow">
          <article className="bg-transparent">
            <header className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-medium font-display text-foreground mb-2 leading-tight tracking-tight mt-0 break-words">
                {post.title}.md
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Raw Markdown Source
              </p>
            </header>

            <pre className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 md:p-5 text-sm leading-7 whitespace-pre-wrap break-words">
              <code>{rawMarkdown}</code>
            </pre>
          </article>
        </div>
      </BlogPostLayout>
    );
  }

  return (
    <BlogPostLayout
      categories={categories}
      currentSlug={slug}
      content={post.content}
    >
      <div className="max-w-4xl mx-auto px-6 md:px-8 pt-6 pb-14 md:pb-20 animate-fade-in-up-slow">
        <article className="bg-transparent">
          <div className="px-0 py-0">
            {/* Post Header */}
            <header className="mb-8 md:mb-12">
              <h1 className="text-3xl font-medium font-display text-foreground mb-4 leading-tight tracking-tight mt-0 break-words">
                {post.title}
              </h1>

              <div className="flex flex-row items-center gap-2 text-gray-500 dark:text-gray-400">
                <time>{format(new Date(post.date), "d MMM, yyyy")}</time>
                {post.readingTime !== undefined && post.readingTime > 0 && (
                  <>
                    <span>·</span>
                    <span>{post.readingTime} min read</span>
                  </>
                )}
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-50 text-gray-600 text-xs font-medium px-3 py-1 rounded-md border border-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Post Content */}
            <div className="mt-6 md:mt-8">
              <MarkdownRenderer content={post.content} date={post.date} />
            </div>
          </div>
        </article>
      </div>
    </BlogPostLayout>
  );
}
