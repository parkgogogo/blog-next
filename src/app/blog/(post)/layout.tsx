import { ReactNode } from "react";
import BlogPostLayout from "@/components/BlogPostLayout";
import { PostService } from "@/lib/posts";

export default async function BlogPostSegmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const categories = await PostService.getCategory();

  return <BlogPostLayout categories={categories}>{children}</BlogPostLayout>;
}
