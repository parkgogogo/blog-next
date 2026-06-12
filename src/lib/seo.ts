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
  description:
    "Parkgogogo 是 Park 在 parkgogogo.me 的个人博客，记录前端工程、AI 编程、产品思考和日常写作。",
  author: {
    name: "Park",
    alternateName: "parkgogogo",
    url: siteUrl,
  },
  url: siteUrl,
};

export const siteKeywords = [
  "Parkgogogo",
  "parkgogogo",
  "parkgogogo.me",
  "Park",
  "Park 的博客",
  "前端工程",
  "AI 编程",
  "产品思考",
  "技术博客",
];

export const siteSameAs = [
  "https://github.com/parkgogogo",
  "https://gist.github.com/parkgogogo",
];

export const blogIndexTitle = "Park 的博客";
export const blogIndexDescription =
  "Parkgogogo 收录 Park 关于前端工程、AI 编程、产品思考与日常写作的博客。";
export const blogIndexKeywords = [
  "Parkgogogo",
  "parkgogogo",
  "parkgogogo.me",
  "Park",
  "前端工程",
  "AI 编程",
  "产品思考",
  "技术博客",
];

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalizedPath}`;
}

export function blogPostPath(slug: string): string {
  return `/blog/${encodeURIComponent(slug)}`;
}

export function rssAlternateTypes(): Record<string, string> {
  return {
    "application/rss+xml": absoluteUrl("/rss/blog.xml"),
  };
}

export function personJsonLd() {
  return {
    "@type": "Person",
    name: siteConfig.author.name,
    alternateName: siteConfig.author.alternateName,
    url: siteConfig.author.url,
    sameAs: siteSameAs,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    alternateName: ["parkgogogo", "parkgogogo.me", "Park 的博客"],
    url: siteConfig.url,
    inLanguage: "zh-CN",
    publisher: personJsonLd(),
  };
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
