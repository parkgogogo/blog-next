"use client";

import Image from "next/image";
import Link from "next/link";
import type { MouseEvent, PointerEvent } from "react";
import {
  attributeLabel,
  barcodeBars,
  cardNumber,
  digiDate,
  postAttribute,
  postDigimon,
  postStage,
} from "@/lib/digi";
import { blogPostPath, postDescription } from "@/lib/seo";
import type { BlogPost } from "@/types/blog";
import { useCardSlash } from "./CardSlash";

function handlePointerMove(event: PointerEvent<HTMLAnchorElement>) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
  card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  card.style.setProperty("--rx", `${((0.5 - y) * 10).toFixed(2)}deg`);
  card.style.setProperty("--ry", `${((x - 0.5) * 12).toFixed(2)}deg`);
}

function handlePointerLeave(event: PointerEvent<HTMLAnchorElement>) {
  const card = event.currentTarget;
  card.style.setProperty("--rx", "0deg");
  card.style.setProperty("--ry", "0deg");
}

/**
 * 文章即数码宝贝卡：属性决定进化线与卡框颜色，阅读时长决定卡面形态。
 * 右侧金属磁条致敬“卡片刷入”，悬停时扫描光沿磁条划过。
 */
export function PostCard({ post, index }: { post: BlogPost; index: number }) {
  const attribute = postAttribute(post);
  const stage = postStage(post);
  const digimon = postDigimon(post);
  const bars = barcodeBars(post.slug);
  const kicker = post.tags?.[0] ?? post.category;
  const slash = useCardSlash();
  const href = blogPostPath(post.slug);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // 新标签页打开等修饰键点击保持浏览器默认行为
    if (
      !slash ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    slash({
      href,
      attribute,
      digimonId: digimon.id,
      digimonName: digimon.name,
      title: post.title,
      stage: stage.en,
      from: event.currentTarget.getBoundingClientRect(),
    });
  }

  return (
    <article className="digi-card-wrap">
      <Link
        href={href}
        className="digi-card"
        onClick={handleClick}
        data-attribute={attribute}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <span className="digi-card__stripe" aria-hidden="true">
          {bars.map((width, barIndex) => (
            <i key={barIndex} style={{ height: `${width}px` }} />
          ))}
          <span className="digi-card__slash" />
        </span>

        <header className="digi-card__head">
          <span className="digi-card__stage">{stage.zh}</span>
          <span className="digi-card__name font-display-anime">{digimon.name}</span>
          <span className="digi-card__attr font-hud">{attributeLabel(attribute)}</span>
        </header>

        <div className="digi-card__art">
          <Image
            src={`/digimon/cards/${digimon.id}.webp`}
            alt=""
            width={320}
            height={320}
            sizes="(max-width: 640px) 80vw, 280px"
            className="digi-card__art-img"
          />
          <span className="digi-card__holo" aria-hidden="true" />
          <span className="digi-card__no font-pixel-latin">{cardNumber(index)}</span>
          <span className="digi-card__lv font-hud">Lv.{stage.en}</span>
        </div>

        <div className="digi-card__text">
          <h3 className="digi-card__title">{post.title}</h3>
          <p className="digi-card__excerpt">{postDescription(post)}</p>
        </div>

        <footer className="digi-card__foot">
          <span className="font-hud">{digiDate(post.date)}</span>
          {kicker && <span className="digi-card__tag">#{kicker}</span>}
          <span className="digi-card__go font-hud" aria-hidden="true">
            SLASH ▸
          </span>
        </footer>
      </Link>
    </article>
  );
}
