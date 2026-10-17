import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found">
      <p className="post-meta">404</p>
      <h1>Page not found</h1>
      <p>你要找的页面不存在，或者已经换了地址。</p>
      <Link href="/" className="pill">
        Back to all posts
      </Link>
    </div>
  );
}
