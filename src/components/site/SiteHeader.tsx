import Link from "next/link";
import { siteConfig, siteLinks } from "@/lib/seo";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="site-header__brand">
        {siteConfig.author.shortName}
      </Link>
      <nav aria-label="Primary" className="site-header__nav">
        {siteLinks.map((link) => (
          <a key={link.href} href={link.href} rel={link.rel}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
