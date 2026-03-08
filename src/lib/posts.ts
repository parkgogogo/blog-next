import { Octokit } from "@octokit/rest";
import matter from "gray-matter";
import { BlogPost, Category } from "@/types/blog";

interface GitHubContentItem {
  type: "file" | "dir" | "submodule" | "symlink";
  name: string;
  path: string;
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const GITHUB_OWNER = process.env.GITHUB_OWNER || "your-username";
const GITHUB_REPO = process.env.GITHUB_REPO || "your-blog-repo";
const POSTS_PATH = process.env.POSTS_PATH || "posts";

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

/**
 * 获取文件在 GitHub 上最早的提交日期，作为文件创建时间的近似
 * 如果获取失败或没有提交记录，返回当前时间的 ISO 字符串
 */
async function getFileCreationDate(filePath: string): Promise<string> {
  try {
    // 获取该文件的所有提交（按时间从新到旧）
    const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      per_page: 100,
    });

    if (!Array.isArray(commits) || commits.length === 0) {
      return new Date().toISOString();
    }

    // 最旧的提交是数组最后一项
    const oldest = commits[commits.length - 1];
    const date =
      oldest && (oldest.commit?.author?.date || oldest.commit?.committer?.date);

    return date || new Date().toISOString();
  } catch (error) {
    console.error(`Error fetching commits for ${filePath}:`, error);
    return new Date().toISOString();
  }
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

async function processMarkdownFile(
  file: GitHubContentItem,
  categoryPath: string
): Promise<BlogPost | null> {
  try {
    const { data: fileContent } = await octokit.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: file.path,
    });

    if ("content" in fileContent) {
      const content = Buffer.from(fileContent.content, "base64").toString(
        "utf-8"
      );
      const { data: frontmatter, content: markdown } = matter(content);

      const slug = file.name.replace(".md", "");
      const category = categoryPath.split("/").pop() || "uncategorized";
      const normalizedSlugTitle = slug.replace(/_/g, " ");
      const normalizedFrontmatterTitle =
        typeof frontmatter.title === "string"
          ? frontmatter.title.replace(/_/g, " ")
          : undefined;

      return {
        slug,
        title: normalizedFrontmatterTitle || normalizedSlugTitle,
        date: await getFileCreationDate(file.path),
        content: markdown,
        excerpt: frontmatter.excerpt || markdown.slice(0, 200) + "...",
        tags: frontmatter.tags || [],
        readingTime: calculateReadingTime(markdown),
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

  const category: Category = {
    name: categoryName,
    path: categoryPath,
    posts: [],
    subcategories: [],
  };

  for (const item of contents) {
    if (item.type === "dir") {
      const subcategory = await processCategory(item.path);
      category.subcategories!.push(subcategory);
    } else if (item.type === "file" && item.name.endsWith(".md")) {
      const post = await processMarkdownFile(item, categoryPath);
      if (post) {
        category.posts.push(post);
      }
    }
  }

  category.posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return category;
}

export const PostService = (() => {
  let promise: Promise<Category>;

  const check = () => {
    if (!promise) {
      promise = processCategory(POSTS_PATH);
    }
  };

  const getRootCategory = async (): Promise<Category> => {
    check();
    return await promise;
  };

  const getSlugs = async (): Promise<string[]> => {
    check();
    const category = await promise;
    const slugs: string[] = [];

    const getSlugFromCategories = (categories: Category[]) => {
      for (const category of categories) {
        slugs.push(...category.posts.map((post) => post.slug));
        if (Array.isArray(category.subcategories)) {
          getSlugFromCategories(category.subcategories);
        }
      }
    };

    getSlugFromCategories([category]);
    return slugs;
  };

  const getAllPosts = async (): Promise<BlogPost[]> => {
    check();
    const category = await promise;
    const posts: BlogPost[] = [];

    const getPostFromCategories = (categories: Category[]) => {
      for (const category of categories) {
        posts.push(...category.posts);
        if (Array.isArray(category.subcategories)) {
          getPostFromCategories(category.subcategories);
        }
      }
    };

    getPostFromCategories([category]);
    return posts;
  };

  const getRawMarkdownBySlug = async (slug: string): Promise<string | null> => {
    check();
    const posts = await getAllPosts();
    const post = posts.find((item) => item.slug === slug);

    if (!post) {
      return null;
    }

    try {
      const filePath = `${post.categoryPath}/${post.slug}.md`;
      const { data: fileContent } = await octokit.rest.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: filePath,
      });

      if ("content" in fileContent) {
        return Buffer.from(fileContent.content, "base64").toString("utf-8");
      }
    } catch (error) {
      console.error(`Error fetching raw markdown for ${slug}:`, error);
    }

    return null;
  };

  return {
    getCategory: getRootCategory,
    getSlugs,
    getAllPosts,
    getRawMarkdownBySlug,
  };
})();
