export interface PostLink {
  label: string;
  href: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  content: string;
  rawMarkdown?: string;
  excerpt?: string;
  subtitle?: string;
  cover?: string;
  authors?: string[];
  links?: PostLink[];
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
