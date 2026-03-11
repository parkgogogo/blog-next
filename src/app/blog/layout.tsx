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
      <div className="px-6 pt-3 pb-4 md:h-16">
        <div className="flex items-center gap-4 md:fixed md:left-6 md:top-3 md:z-40">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
