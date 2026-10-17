import Link from "next/link";
import { siteConfig, siteLinks } from "@/lib/seo";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link href="/">
        © {new Date().getFullYear()} {siteConfig.author.shortName}
      </Link>
      <nav aria-label="Footer" className="site-footer__nav">
        {siteLinks.map((link) => (
          <a key={link.href} href={link.href} rel={link.rel}>
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
