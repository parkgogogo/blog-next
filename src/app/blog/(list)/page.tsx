import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { BlogPost, Category } from "@/types/blog";
import { PostService } from "@/lib/posts";

export const revalidate = false;

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
    <div className="divide-y divide-[color:var(--border-default)]">
      {allPosts.map((post) => (
        <article key={post.slug} className="group">
          <Link
            href={`/blog/${post.slug}`}
            className="block py-5 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--link-primary)]"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold leading-6 text-[color:var(--foreground-strong)] transition-colors duration-150 group-hover:text-[color:var(--link-primary)]">
                {post.title}
              </h3>
              <p className="line-clamp-2 text-sm leading-5 text-[color:var(--text-muted)]">
                {getDisplayExcerpt(post)}
              </p>
              <div className="flex items-center gap-2 text-sm leading-5 text-[color:var(--text-tertiary)]">
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
  const categories = await PostService.getCategory();

  return (
    <div className="mx-auto w-full max-w-[72rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <header className="mx-auto mb-1 max-w-3xl">
        <h1 className="h-[42px]" aria-label="Blog">
          <Image
            src="/blog-title-light.png"
            alt=""
            width={143}
            height={84}
            priority
            className="blog-title-image blog-title-image--light"
          />
          <Image
            src="/blog-title-dark.png"
            alt=""
            width={143}
            height={84}
            priority
            className="blog-title-image blog-title-image--dark"
          />
        </h1>
        <div className="mt-3 h-6" aria-label="随手记点东西">
          <Image
            src="/blog-subtitle-light.png"
            alt="随手记点东西"
            width={223}
            height={48}
            priority
            className="blog-subtitle-image blog-subtitle-image--light"
          />
          <Image
            src="/blog-subtitle-dark.png"
            alt=""
            width={223}
            height={48}
            priority
            className="blog-subtitle-image blog-subtitle-image--dark"
          />
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        <CategorySection category={categories} />
      </div>

      {categories.posts.length === 0 &&
        (!categories.subcategories ||
          categories.subcategories.length === 0) && (
          <div className="mx-auto max-w-3xl py-16">
            <div className="max-w-md rounded-[10px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-5">
              <h3 className="text-sm font-semibold leading-5 text-[color:var(--foreground-strong)]">
                No content found
              </h3>
              <p className="mt-2 text-sm leading-5 text-[color:var(--text-muted)]">
                Get started by creating your first markdown file in your
                repository.
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
