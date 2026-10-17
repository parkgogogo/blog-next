import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link href="/">© {new Date().getFullYear()} parkgogogo.site</Link>
    </footer>
  );
}
