"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { attributeLabel, postAttribute, type DigiAttribute } from "@/lib/digi";
import type { BlogPost } from "@/types/blog";
import { PostCard } from "./PostCard";

type Filter = "all" | DigiAttribute;

const FILTERS: Filter[] = ["all", "vaccine", "data", "virus"];

/**
 * 手牌：最新一张作为主卡单独展示，其余在桌面端排成扇形手牌，
 * 悬停抬起；可按属性筛选。滚动进入时卡片像从 D-Ark 里发牌一样飞入。
 */
export function CardHand({ posts }: { posts: BlogPost[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [featured, ...rest] = posts;

  const hand = useMemo(
    () =>
      rest
        .map((post, index) => ({ post, index: index + 1 }))
        .filter(({ post }) => filter === "all" || postAttribute(post) === filter),
    [rest, filter]
  );

  if (!featured) {
    return (
      <p className="text-[color:var(--text-muted)]">
        卡组还是空的——数码世界正在加载中……
      </p>
    );
  }

  const counts = posts.reduce<Record<DigiAttribute, number>>(
    (total, post) => {
      total[postAttribute(post)] += 1;
      return total;
    },
    { vaccine: 0, data: 0, virus: 0 }
  );

  return (
    <div className="card-hand">
      <div className="card-hand__featured deal" style={{ "--deal": 0 } as CSSProperties}>
        <span className="card-hand__badge font-mono">NEW CARD · 最新</span>
        <PostCard post={featured} index={0} />
      </div>

      <div className="card-hand__side">
        <div className="card-hand__filters" role="tablist" aria-label="按属性筛选">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={filter === item}
              data-attribute={item}
              className="card-hand__filter font-mono"
              onClick={() => setFilter(item)}
            >
              {item === "all" ? "ALL" : attributeLabel(item)}
              <small>
                {item === "all" ? rest.length : rest.filter((post) => postAttribute(post) === item).length}
              </small>
            </button>
          ))}
        </div>

        {hand.length > 0 ? (
          <div
            className="card-hand__fan"
            style={{ "--n": hand.length } as CSSProperties}
          >
            {hand.map(({ post, index }, position) => (
              <div
                key={post.slug}
                className="card-hand__slot"
                style={{ "--i": position, "--deal": position + 1 } as CSSProperties}
              >
                <div className="deal">
                  <PostCard post={post} index={index} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="card-hand__empty">
            这个属性还没有卡。目前的卡组：疫苗种 {counts.vaccine} · 数据种 {counts.data} · 病毒种{" "}
            {counts.virus}
          </p>
        )}
      </div>
    </div>
  );
}
