import type { BlogPost } from "@/types/blog";

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
    displayName: "Gerard Parker",
    // 页头品牌与页脚署名用的短名；SEO 与结构化数据仍用 name
    shortName: "Parker",
    alternateName: "parkgogogo",
    url: siteUrl,
  },
  url: siteUrl,
  bio: ["在比特世界留下我的踪迹", "Life finds a way."],
};

export const siteLinks = [
  { label: "GitHub", href: "https://github.com/parkgogogo", rel: "me noreferrer" },
  { label: "RSS", href: "/rss/blog.xml" },
];

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
