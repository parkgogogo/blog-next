import { ReactNode } from "react";
import BlogShell from "@/components/BlogShell";
import { PostService } from "@/lib/posts";

export default async function BlogLayout({
  children,
}: {
  children: ReactNode;
}) {
  const categories = await PostService.getCategory();

  return <BlogShell categories={categories}>{children}</BlogShell>;
}
