import { BlogPost } from "@/types/blog";
import { formatDateLabel } from "@/lib/date";
import MarkdownRenderer from "./MarkdownRenderer";

interface BlogPostComponentProps {
  post: BlogPost;
  showFullContent?: boolean;
}

export default function BlogPostComponent({
  post,
  showFullContent = false,
}: BlogPostComponentProps) {
  const formattedDate = formatDateLabel(post.date, "MMMM d, yyyy");

  return (
    <article className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          {formattedDate && (
            <time className="text-sm text-gray-500">{formattedDate}</time>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4 hover:text-blue-600 transition-colors">
          {post.title}
        </h2>

        {showFullContent ? (
          <MarkdownRenderer content={post.content} />
        ) : (
          <div className="mb-4">
            <p className="text-gray-700 text-base leading-relaxed">
              {post.excerpt}
            </p>
          </div>
        )}

        {!showFullContent && (
          <div className="flex justify-between items-center mt-4">
            <a
              href={`/blog/${post.slug}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
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
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
