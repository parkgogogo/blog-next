export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  content: string;
  rawMarkdown?: string;
  excerpt?: string;
  tags?: string[];
  category: string;
  categoryPath: string;
  readingTime?: number;
}

export interface Category {
  name: string;
  path: string;
  posts: BlogPost[];
  subcategories?: Category[];
}

export interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}
