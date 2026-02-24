import Link from "next/link";
import { format } from "date-fns";
import { BlogPost, Category } from "@/types/blog";
import { PostService } from "@/lib/posts";

function CategorySection({ category }: { category: Category }) {
  const getAllPosts = (cat: Category): BlogPost[] => {
    let posts = [...cat.posts];
    if (cat.subcategories) {
      cat.subcategories.forEach((subcat) => {
        posts = [...posts, ...getAllPosts(subcat)];
      });
    }
    return posts;
  };

  const allPosts = getAllPosts(category).sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    return tb - ta;
  });

  if (allPosts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-12 animate-fade-in-up">
      {allPosts.map((post) => (
        <article key={post.slug} className="group">
          <Link href={`/blog/${post.slug}`}>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 dark:group-hover:text-gray-300 group-hover:text-gray-600 transition-colors mb-2 sm:mb-0 sm:mr-4">
                {post.title}
              </h3>
              <p className="line-clamp-2 text-gray-600 dark:text-gray-300 mt-3">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-2">
                <time>{format(new Date(post.date), "d MMM, yyyy")}</time>
                {post.readingTime !== undefined && post.readingTime > 0 && (
                  <>
                    <span>·</span>
                    <span>{post.readingTime} min read</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}

export default async function BlogPage() {
  // 使用 lib/posts 中的函数直接获取数据
  const categories = await PostService.getCategory();

  return (
    <div className="max-w-4xl mx-auto px-6 pb-20">
      {/* Header */}
      <header className="mb-16">
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-gray-200 mb-3">
          Blogs
        </h1>
      </header>

      {/* Content */}
      <div className="space-y-12">
        <CategorySection category={categories} />
      </div>

      {/* No content state */}
      {categories.posts.length === 0 &&
        (!categories.subcategories ||
          categories.subcategories.length === 0) && (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No content found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first markdown file in your
                repository.
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
