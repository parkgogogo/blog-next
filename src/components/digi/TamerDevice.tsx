"use client";

import type { PartnerForm } from "@/lib/digi";
import { DArk } from "./DArk";
import { DotSprite } from "./DotSprite";

/**
 * 首页的 D-Ark：液晶屏里是当年玩具的 1-bit 点阵。
 * 进化状态由 HeroPartner 统一管理，点击屏幕同样会触发进化。
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
            <DotSprite id={form.id} className="darc-lcd__sprite" />
            <span className="darc-lcd__flash" aria-hidden="true" />
          </button>
        }
      />
      <p className="tamer-darc__hint">TAP SCREEN TO EVOLVE ▸</p>
    </div>
  );
}
