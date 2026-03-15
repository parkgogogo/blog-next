import { unstable_cache } from "next/cache";
import { Octokit } from "@octokit/rest";
import matter from "gray-matter";
import { BlogPost, Category } from "@/types/blog";

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
const POSTS_REVALIDATE_SECONDS = 300;

/**
 * 计算阅读时间
 * @param content
 * @returns
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200; // 假设每分钟阅读200个字
  const text = content.replace(/[#*`~\[\]()]/g, ""); // 移除markdown标记
  const wordCount = text.length; // 中文字符数
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return readingTime || 1; // 最少1分钟
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

function resolvePostDate(frontmatter: Record<string, unknown>): string {
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

  return new Date().toISOString();
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

async function processMarkdownFile(
  file: GitHubContentItem,
  categoryPath: string
): Promise<BlogPost | null> {
  try {
    const rawMarkdown = await getMarkdownContent(file.path);

    if (rawMarkdown) {
      const { data, content } = matter(rawMarkdown);
      const frontmatter = data as Record<string, unknown>;
      const slug = file.name.replace(/\.md$/, "");
      const category = categoryPath.split("/").pop() || "uncategorized";
      const normalizedSlugTitle = slug.replace(/_/g, " ");
      const normalizedFrontmatterTitle =
        typeof frontmatter.title === "string"
          ? frontmatter.title.replace(/_/g, " ")
          : undefined;
      const excerpt =
        typeof frontmatter.excerpt === "string"
          ? frontmatter.excerpt
          : `${content.slice(0, 200)}...`;

      return {
        slug,
        title: normalizedFrontmatterTitle || normalizedSlugTitle,
        date: resolvePostDate(frontmatter),
        content,
        excerpt,
        tags: Array.isArray(frontmatter.tags)
          ? frontmatter.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
        readingTime: calculateReadingTime(content),
        category,
        categoryPath,
      };
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
        rawMarkdownBySlug[post.slug] = post.content;
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
