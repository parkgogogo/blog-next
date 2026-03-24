import { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import Link from "next/link";

export default async function BlogLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 left-0 right-0 z-20 px-4 sm:px-6 py-3 flex items-center gap-4 bg-background/95 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-sm border-b border-[color:var(--border-subtle)]">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      {children}
    </div>
  );
}
