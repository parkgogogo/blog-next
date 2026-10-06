"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MY_PARTNER } from "@/lib/digi";
import { TamerDevice } from "./TamerDevice";

/** 小丑兽额头红三角在立绘中的位置（百分比） */
const CALUMON_TRIANGLE = { left: 58.6, top: 42.7 };

type Phase = "idle" | "catalyst" | "burst" | "arrive";

/**
 * 首页主视觉：站长的搭档小妖兽 + 小丑兽 + D-Ark 共用一个进化状态。
 * 原作里小丑兽是进化的催化剂——额头的红三角发光，搭档才会进化。
 */
export function HeroPartner() {
  const [stageIndex, setStageIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [evolvedOnce, setEvolvedOnce] = useState(false);
  const timers = useRef<number[]>([]);
  const form = MY_PARTNER[stageIndex];
  const stage = form.stage;
  const artSrc = form.art.src;

  useEffect(
    () => () => timers.current.forEach((id) => window.clearTimeout(id)),
    []
  );

  function evolve() {
    if (phase !== "idle") return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      setStageIndex((current) => (current + 1) % MY_PARTNER.length);
      return;
    }

    setPhase("catalyst");
    timers.current = [
      window.setTimeout(() => setPhase("burst"), 650),
      window.setTimeout(() => {
        setStageIndex((current) => (current + 1) % MY_PARTNER.length);
        setEvolvedOnce(true);
        setPhase("arrive");
      }, 950),
      window.setTimeout(() => setPhase("idle"), 1700),
    ];
  }

  return (
    <div className="digi-keyvisual" data-stage={stage.id} data-phase={phase}>
      <button
        type="button"
        className="calumon"
        onClick={evolve}
        aria-label="小丑兽：点我让搭档进化"
      >
        <span className="calumon__portrait">
          <Image
            src="/digimon/art/calumon.png"
            alt=""
            width={353}
            height={309}
            className="calumon__img"
          />
          <span
            className="calumon__glow"
            aria-hidden="true"
            style={{
              left: `${CALUMON_TRIANGLE.left}%`,
              top: `${CALUMON_TRIANGLE.top}%`,
            }}
          />
        </span>
        <span className="calumon__bubble" aria-hidden="true">
          {phase === "idle" ? "クル～ 点我进化！" : "进化吧！"}
        </span>
      </button>

      <div className="digi-keyvisual__scene">
        <span className="digi-keyvisual__disc" aria-hidden="true" />
        <span className="digi-keyvisual__speed" aria-hidden="true" />
        <span className="digi-keyvisual__hazard" aria-hidden="true">
          <span />
        </span>

        <Image
          key={artSrc}
          src={artSrc}
          alt={`${form.name}（${stage.zh}）`}
          width={form.art.width}
          height={form.art.height}
          priority={stageIndex === 0}
          sizes="(max-width: 1024px) 88vw, 420px"
          className={`digi-keyvisual__art ${evolvedOnce ? "is-arrived" : ""}`}
        />

        <span className="digi-keyvisual__beam" aria-hidden="true" />
        <span className="digi-keyvisual__burst" aria-hidden="true" />

        <span className="digi-keyvisual__caption font-hud" aria-live="polite">
          PARTNER · {form.name}
        </span>

        <div className="digi-keyvisual__device">
          <TamerDevice
            form={form}
            evolving={phase === "burst" || phase === "arrive"}
            onEvolve={evolve}
          />
        </div>
      </div>
    </div>
  );
}
