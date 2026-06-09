import type { BlogPost, Category } from "@/types/blog";

const DEFAULT_SITE_URL = "https://www.parkgogogo.me";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

const siteUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL,
);

export const siteConfig = {
  name: "Parkgogogo",
  title: "Parkgogogo",
  description: "Park 的个人博客，记录前端工程、AI 编程、产品思考和日常写作。",
  author: {
    name: "Park",
    url: siteUrl,
  },
  url: siteUrl,
};

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalizedPath}`;
}

export function blogPostPath(slug: string): string {
  return `/blog/${encodeURIComponent(slug)}`;
}

export function stripMarkdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[#*_~`[\]()<>-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(text: string, maxLength = 160): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

export function postDescription(post: BlogPost): string {
  const source = post.excerpt || post.content;
  const description = truncateText(stripMarkdownToText(source), 160);

  return description || siteConfig.description;
}

export function collectCategoryPosts(category: Category): BlogPost[] {
  const posts = [...category.posts];

  for (const subcategory of category.subcategories || []) {
    posts.push(...collectCategoryPosts(subcategory));
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}
