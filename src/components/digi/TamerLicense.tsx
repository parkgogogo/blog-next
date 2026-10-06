import Image from "next/image";
import Link from "next/link";
import { siteSameAs } from "@/lib/seo";
import type { TamerStats } from "@/lib/digi";

function pad(value: number, length = 3) {
  return String(value).padStart(length, "0");
}

/**
 * 驯兽师执照：站长本人的档案卡，数据全部来自真实文章。
 */
export function TamerLicense({ stats }: { stats: TamerStats }) {
  const maxTag = Math.max(1, ...stats.topTags.map((item) => item.count));
  const attributeTotal = Math.max(1, stats.cards);

  return (
    <article className="tamer-license" aria-label="驯兽师执照">
      <header className="tamer-license__band">
        <span className="font-hud">DIGITAL MONSTER · TAMER LICENSE</span>
        <span className="tamer-license__chip" aria-hidden="true" />
      </header>

      <div className="tamer-license__body">
        <figure className="tamer-license__portrait">
          <Image
            src="/digimon/art/impmon-cute.webp"
            alt="搭档：小妖兽"
            width={713}
            height={900}
            sizes="(max-width: 768px) 40vw, 220px"
          />
          <figcaption className="font-hud">PARTNER · IMPMON</figcaption>
        </figure>

        <div className="tamer-license__info">
          <p className="tamer-license__label font-hud">TAMER</p>
          <p className="tamer-license__name font-display-anime">PARK</p>
          <p className="tamer-license__intro">
            和搭档小妖兽一起，在新宿的数码领域里记录前端工程、AI
            编程、产品思考和日常写作。
          </p>

          <dl className="tamer-license__stats">
            <div>
              <dt className="font-hud">CARDS</dt>
              <dd className="font-display-anime">{pad(stats.cards)}</dd>
            </div>
            <div>
              <dt className="font-hud">SINCE</dt>
              <dd className="font-display-anime">{stats.since}</dd>
            </div>
            <div>
              <dt className="font-hud">READ TIME</dt>
              <dd className="font-display-anime">
                {stats.totalMinutes}
                <small>MIN</small>
              </dd>
            </div>
          </dl>

          <div className="tamer-license__bars">
            <p className="font-hud">ATTRIBUTE</p>
            <div className="tamer-license__attr" aria-label="属性分布">
              {(["vaccine", "data", "virus"] as const).map((attribute) => (
                <span
                  key={attribute}
                  data-attribute={attribute}
                  style={{ flexGrow: Math.max(stats.attributes[attribute], 0.15) }}
                  title={`${attribute.toUpperCase()} ${stats.attributes[attribute]}`}
                >
                  <i className="font-hud">
                    {attribute.toUpperCase()} {Math.round((stats.attributes[attribute] / attributeTotal) * 100)}%
                  </i>
                </span>
              ))}
            </div>

            {stats.topTags.length > 0 && (
              <>
                <p className="font-hud">SKILLS</p>
                <ul className="tamer-license__skills">
                  {stats.topTags.map((item) => (
                    <li key={item.tag}>
                      <span>#{item.tag}</span>
                      <span className="tamer-license__meter" aria-hidden="true">
                        <i style={{ width: `${(item.count / maxTag) * 100}%` }} />
                      </span>
                      <span className="font-hud">×{item.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="tamer-license__actions">
            <Link href="/blog" className="digi-chip">
              Card binder ▸
            </Link>
            <a href={siteSameAs[0]} rel="me noreferrer" className="digi-chip">
              GitHub
            </a>
          </div>
        </div>
      </div>

      <footer className="tamer-license__mrz font-pixel-latin" aria-hidden="true">
        TMR&lt;&lt;PARK&lt;&lt;&lt;IMPMON&lt;&lt;SHINJUKU&lt;&lt;{stats.since}&lt;&lt;{pad(stats.cards)}&lt;&lt;&lt;&lt;
      </footer>
    </article>
  );
}
