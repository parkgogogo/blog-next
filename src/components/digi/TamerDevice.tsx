"use client";

import { useEffect, useState } from "react";
import type { PartnerForm } from "@/lib/digi";
import { DArk } from "./DArk";
import { DotSprite } from "./DotSprite";

const BOOT_LINES = ["HYPNOS", "SCAN..OK", "FIELD ▲"];

/**
 * 首页的 D-Ark：开机先在液晶屏上跑一段 Hypnos 自检，再显示 1-bit 点阵搭档。
 * 进化状态由 HeroScene 统一管理，点击屏幕同样会触发进化。
 */
export function TamerDevice({
  form,
  evolving,
  onEvolve,
}: {
  form: PartnerForm;
  evolving: boolean;
  onEvolve: () => void;
}) {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setBooting(false), 2600);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="tamer-darc" data-stage={form.stage.id}>
      <DArk
        screen={
          <button
            type="button"
            onClick={onEvolve}
            className={`darc-lcd ${evolving ? "is-evolving" : ""}`}
            aria-label={`${form.name}，${form.stage.zh}。点击进化`}
          >
            <span className="darc-lcd__grid" aria-hidden="true" />
            {booting ? (
              <span className="darc-lcd__boot font-pixel-term" aria-hidden="true">
                {BOOT_LINES.map((line, index) => (
                  <span key={line} style={{ animationDelay: `${0.2 + index * 0.6}s` }}>
                    &gt;{line}
                  </span>
                ))}
              </span>
            ) : (
              <DotSprite id={form.id} className="darc-lcd__sprite" />
            )}
            <span className="darc-lcd__flash" aria-hidden="true" />
          </button>
        }
      />
      <p className="tamer-darc__hint">TAP SCREEN TO EVOLVE ▸</p>
    </div>
  );
}
