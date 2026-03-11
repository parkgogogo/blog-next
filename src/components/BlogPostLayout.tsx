import { ReactNode } from "react";
import { Category } from "@/types/blog";

interface BlogPostLayoutProps {
  children: ReactNode;
  categories: Category;
}

export default function BlogPostLayout({
  children,
}: BlogPostLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background">
        <div className="flex-1 min-w-0 bg-background">{children}</div>
      </div>
    </div>
  );
}
