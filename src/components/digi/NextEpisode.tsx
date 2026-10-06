import Image from "next/image";
import Link from "next/link";
import { NEXT_EPISODE } from "@/lib/digi";

/**
 * 页尾的「次回予告」：动画片尾的下集预告。
 */
export function NextEpisode() {
  return (
    <section className="next-episode" aria-labelledby="next-episode-title">
      <div className="next-episode__inner">
        <p className="next-episode__kicker">
          <span>次回予告</span>
          <span className="font-hud">NEXT EPISODE</span>
        </p>
        <h2 id="next-episode-title" className="next-episode__title">
          {NEXT_EPISODE.title}
        </h2>
        <p className="next-episode__teaser">{NEXT_EPISODE.teaser}</p>
        <div className="next-episode__actions">
          <Link href="/rss/blog.xml" className="digi-button">
            <span className="font-hud">SUBSCRIBE</span>
            <span>订阅 RSS</span>
          </Link>
          <p className="next-episode__sign font-display-anime">
            See you <em>next episode!</em>
          </p>
        </div>
      </div>
      <Image
        src="/digimon/hero/impmon-sitting.webp"
        alt=""
        width={695}
        height={900}
        sizes="240px"
        className="next-episode__art"
        aria-hidden="true"
      />
    </section>
  );
}
