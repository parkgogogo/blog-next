import { unstable_cache } from "next/cache";
import { Octokit } from "@octokit/rest";
import matter from "gray-matter";
import { BlogPost, Category, PostLink } from "@/types/blog";
import { stripMarkdownToText, truncateText } from "@/lib/seo";

interface GitHubContentItem {
  type: "file" | "dir" | "submodule" | "symlink";
  name: string;
  path: string;
}

interface PostIndex {
  category: Category;
  posts: BlogPost[];
  postsBySlug: Record<string, BlogPost>;
  rawMarkdownBySlug: Record<string, string>;
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const GITHUB_OWNER = process.env.GITHUB_OWNER || "your-username";
const GITHUB_REPO = process.env.GITHUB_REPO || "your-blog-repo";
const POSTS_PATH = process.env.POSTS_PATH || "posts";
const POSTS_REVALIDATE_SECONDS = false;

/**
 * 估算阅读时间：中文按 400 字/分钟，西文按 220 词/分钟，忽略代码块
 */
function calculateReadingTime(content: string): number {
  const prose = content.replace(/```[\s\S]*?```/g, " ");
  const cjk = prose.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words =
    prose.replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9]+/g)?.length ?? 0;
  return Math.max(1, Math.round(cjk / 400 + words / 220));
}

function isGitHubConfigured(): boolean {
  return !(
    !process.env.GITHUB_TOKEN ||
    GITHUB_OWNER === "your-username" ||
    GITHUB_REPO === "your-blog-repo"
  );
}

function createEmptyCategory(path: string): Category {
  return {
    name: path.split("/").pop() || "root",
    path,
    posts: [],
    subcategories: [],
  };
}

function createEmptyIndex(): PostIndex {
  return {
    category: createEmptyCategory(POSTS_PATH),
    posts: [],
    postsBySlug: {},
    rawMarkdownBySlug: {},
  };
}

function resolvePostDate(frontmatter: Record<string, unknown>): string | null {
  const candidate =
    frontmatter.date ?? frontmatter.createdAt ?? frontmatter.updatedAt;

  if (
    typeof candidate === "string" ||
    typeof candidate === "number" ||
    candidate instanceof Date
  ) {
    const normalizedDate = new Date(candidate);
    if (!Number.isNaN(normalizedDate.getTime())) {
      return normalizedDate.toISOString();
    }
  }

  return null;
}

/**
 * 没写 frontmatter 日期的旧文章，用文件最近一次提交的时间
 */
async function getLastCommitDate(filePath: string): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      per_page: 1,
    });
    return data[0]?.commit.committer?.date ?? data[0]?.commit.author?.date ?? null;
  } catch (error) {
    console.error(`Error fetching commit date for ${filePath}:`, error);
    return null;
  }
}

/**
 * 摘要取第一段正文，跳过标题、图片、代码、表格、列表等
 */
export function firstParagraph(content: string): string {
  const block = content
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .find(
      (item) =>
        item !== "" &&
        !/^(#{1,6}\s|!\[|\||>|[-*+]\s|\d+[.)]\s|<|\$\$|---|\[\^)/.test(item)
    );

  return block ? truncateText(stripMarkdownToText(block), 120) : "";
}

async function getDirectoryContents(
  path: string
): Promise<GitHubContentItem[]> {
  try {
    const { data: contents } = await octokit.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: path,
    });

    if (!Array.isArray(contents)) {
      return [];
    }

    return contents;
  } catch (error) {
    console.error(`Error fetching directory contents for ${path}:`, error);
    return [];
  }
}

async function getMarkdownContent(filePath: string): Promise<string | null> {
  try {
    const { data: fileContent } = await octokit.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
    });

    if ("content" in fileContent) {
      return Buffer.from(fileContent.content, "base64").toString("utf-8");
    }
  } catch (error) {
    console.error(`Error fetching markdown content for ${filePath}:`, error);
  }

  return null;
}

const HASHTAG_LINE = /^#[\p{L}\p{N}_-]+(?:\s+#[\p{L}\p{N}_-]+)*$/u;

/**
 * 旧文章习惯在正文第一行写 `#tag #tag`，把它提取为标签并从正文移除
 */
export function extractLeadingHashtags(content: string): {
  content: string;
  tags: string[];
} {
  const lines = content.split("\n");
  const index = lines.findIndex((line) => line.trim() !== "");

  if (index === -1 || !HASHTAG_LINE.test(lines[index].trim())) {
    return { content, tags: [] };
  }

  const tags = lines[index]
    .trim()
    .split(/\s+/)
    .map((tag) => tag.slice(1));

  return {
    content: lines.slice(index + 1).join("\n").replace(/^\s+/, ""),
    tags,
  };
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function linkList(value: unknown): PostLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { label, href } = item as Record<string, unknown>;
    return typeof label === "string" && typeof href === "string"
      ? [{ label, href }]
      : [];
  });
}

export function parsePost(
  rawMarkdown: string,
  slug: string,
  categoryPath: string,
  fallbackDate: string = new Date().toISOString()
): BlogPost {
  const { data, content: body } = matter(rawMarkdown);
  const frontmatter = data as Record<string, unknown>;
  const { content, tags: hashtags } = extractLeadingHashtags(body);
  const folder = categoryPath.split("/").pop() || "";
  const isRoot = categoryPath === POSTS_PATH;
  const title = stringField(frontmatter.title)?.replace(/_/g, " ");

  return {
    slug,
    title: title || slug.replace(/_/g, " "),
    date: resolvePostDate(frontmatter) ?? fallbackDate,
    content,
    rawMarkdown,
    excerpt: stringField(frontmatter.excerpt) ?? firstParagraph(content),
    subtitle: stringField(frontmatter.subtitle),
    cover: stringField(frontmatter.cover),
    authors: stringList(frontmatter.authors ?? frontmatter.author),
    links: linkList(frontmatter.links),
    tags: [...new Set([...stringList(frontmatter.tags), ...hashtags])],
    readingTime: calculateReadingTime(content),
    category: stringField(frontmatter.category) ?? (isRoot ? "" : folder),
    categoryPath,
  };
}

async function processMarkdownFile(
  file: GitHubContentItem,
  categoryPath: string
): Promise<BlogPost | null> {
  try {
    const rawMarkdown = await getMarkdownContent(file.path);

    if (rawMarkdown) {
      const hasDate = resolvePostDate(matter(rawMarkdown).data) !== null;
      const fallbackDate = hasDate ? undefined : await getLastCommitDate(file.path);
      return parsePost(
        rawMarkdown,
        file.name.replace(/\.md$/, ""),
        categoryPath,
        fallbackDate ?? undefined
      );
    }
  } catch (error) {
    console.error(`Error processing file ${file.name}:`, error);
  }

  return null;
}

async function processCategory(categoryPath: string): Promise<Category> {
  const categoryName = categoryPath.split("/").pop() || "root";
  const contents = await getDirectoryContents(categoryPath);
  const directories = contents.filter((item) => item.type === "dir");
  const markdownFiles = contents.filter(
    (item) => item.type === "file" && item.name.endsWith(".md")
  );

  const [subcategories, posts] = await Promise.all([
    Promise.all(directories.map((item) => processCategory(item.path))),
    Promise.all(markdownFiles.map((item) => processMarkdownFile(item, categoryPath))),
  ]);

  const category: Category = {
    name: categoryName,
    path: categoryPath,
    posts: posts.filter((post): post is BlogPost => post !== null),
    subcategories,
  };

  category.posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  (category.subcategories || []).sort((a, b) => a.name.localeCompare(b.name));

  return category;
}

function collectPostIndex(category: Category): PostIndex {
  const posts: BlogPost[] = [];
  const postsBySlug: Record<string, BlogPost> = {};
  const rawMarkdownBySlug: Record<string, string> = {};

  const visit = (currentCategory: Category) => {
    for (const post of currentCategory.posts) {
      posts.push(post);
      if (!postsBySlug[post.slug]) {
        postsBySlug[post.slug] = post;
        rawMarkdownBySlug[post.slug] = post.rawMarkdown || post.content;
      }
    }

    for (const subcategory of currentCategory.subcategories || []) {
      visit(subcategory);
    }
  };

  visit(category);
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    category,
    posts,
    postsBySlug,
    rawMarkdownBySlug,
  };
}

async function buildPostIndex(): Promise<PostIndex> {
  if (!isGitHubConfigured()) {
    console.warn(
      "PostService is not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO to load blog posts."
    );
    return createEmptyIndex();
  }

  try {
    const category = await processCategory(POSTS_PATH);
    return collectPostIndex(category);
  } catch (error) {
    console.error("Error building blog post index:", error);
    return createEmptyIndex();
  }
}

const getCachedPostIndex = unstable_cache(
  async () => buildPostIndex(),
  ["blog-post-index", GITHUB_OWNER, GITHUB_REPO, POSTS_PATH],
  {
    revalidate: POSTS_REVALIDATE_SECONDS,
  }
);

export const PostService = (() => {
  const getRootCategory = async (): Promise<Category> => {
    return (await getCachedPostIndex()).category;
  };

  const getSlugs = async (): Promise<string[]> => {
    return (await getCachedPostIndex()).posts.map((post) => post.slug);
  };

  const getAllPosts = async (): Promise<BlogPost[]> => {
    return (await getCachedPostIndex()).posts;
  };

  const getPostBySlug = async (slug: string): Promise<BlogPost | null> => {
    return (await getCachedPostIndex()).postsBySlug[slug] || null;
  };

  const getRawMarkdownBySlug = async (slug: string): Promise<string | null> => {
    return (await getCachedPostIndex()).rawMarkdownBySlug[slug] || null;
  };

  return {
    getCategory: getRootCategory,
    getSlugs,
    getAllPosts,
    getPostBySlug,
    getRawMarkdownBySlug,
  };
})();
