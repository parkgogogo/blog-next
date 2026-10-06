import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[46rem] px-5 py-24 sm:px-8">
      <p className="font-mono text-xs tracking-[0.2em] text-[color:var(--accent)]">
        404 · CARD NOT FOUND
      </p>
      <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.4rem)] font-black text-[color:var(--foreground-strong)]">
        这张卡不在卡册里
      </h1>
      <p className="mt-3 leading-[1.9] text-[color:var(--text-muted)]">
        你要找的文章不存在，或者已经换了地址。
      </p>
      <div className="mt-8">
        <Link href="/blog" className="v2-btn">
          <span>回到卡册</span>
          <span className="font-mono">BACK TO BINDER</span>
        </Link>
      </div>
    </div>
  );
}
