import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/site/ThemeToggle";
import { siteConfig, siteLinks } from "@/lib/seo";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="site-header__brand">
        <Image
          src="/avatar.jpg"
          alt=""
          width={28}
          height={28}
          priority
          className="site-header__avatar"
        />
        {siteConfig.author.shortName}
      </Link>
      <nav aria-label="Primary" className="site-header__nav">
        {siteLinks.map((link) => (
          <a key={link.href} href={link.href} rel={link.rel}>
            {link.label}
          </a>
        ))}
        <ThemeToggle />
      </nav>
    </header>
  );
}
