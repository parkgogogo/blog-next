import Image from "next/image";
import Link from "next/link";
import { siteSameAs } from "@/lib/seo";

export function DigiFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="digi-footer">
      <div className="mx-auto flex w-full max-w-[72rem] flex-col items-center gap-5 px-5 py-14 text-center sm:px-8">
        <div className="flex items-end gap-3" aria-hidden="true">
          <Image
            src="/digimon/dot/impmon-color.png"
            alt=""
            width={128}
            height={128}
            className="digi-footer__sprite h-12 w-12 [image-rendering:pixelated]"
          />
          <Image
            src="/digimon/dot/beelzebumon-color.png"
            alt=""
            width={128}
            height={128}
            className="digi-footer__sprite digi-footer__sprite--late h-12 w-12 [image-rendering:pixelated]"
          />
        </div>
        <p className="font-display-anime text-2xl text-[color:var(--foreground-strong)]">
          To be continued
          <span className="digi-blink text-[color:var(--accent)]" aria-hidden="true">
            ▶
          </span>
        </p>
        <p className="text-[color:var(--text-muted)]">
          下一话：继续做最大的梦。
        </p>
        <nav aria-label="Footer" className="flex items-center gap-3">
          <Link href="/blog" className="digi-chip">
            Blog
          </Link>
          <a href={siteSameAs[0]} rel="me noreferrer" className="digi-chip">
            GitHub
          </a>
          <Link href="/rss/blog.xml" className="digi-chip">
            RSS
          </Link>
        </nav>
        <p className="font-hud text-[0.7rem] tracking-[0.24em] text-[color:var(--text-tertiary)]">
          © {year} PARK · PARKGOGOGO.ME · DIGIMON © 本郷あきよし・東映アニメーション
        </p>
      </div>
    </footer>
  );
}
