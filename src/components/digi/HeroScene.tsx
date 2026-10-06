"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { MY_PARTNER } from "@/lib/digi";
import { TamerDevice } from "./TamerDevice";

type TimeOfDay = "day" | "dusk" | "night";
type Phase = "idle" | "catalyst" | "burst" | "arrive";

const SKY: Record<TimeOfDay, string> = {
  day: "/digimon/hero/sky-day.webp",
  dusk: "/digimon/hero/sky-dusk.webp",
  night: "/digimon/hero/sky-night.webp",
};

/** 成长期坐在栏杆上；进化后的形态站在栏杆上 */
const PARTNER_ART = [
  { src: "/digimon/hero/impmon-sitting.webp", width: 695, height: 900, pose: "sit" },
  { src: "/digimon/art/beelzebumon-anime.webp", width: 861, height: 900, pose: "stand" },
  { src: "/digimon/art/beelzebumon-blast-4wings.webp", width: 889, height: 900, pose: "stand" },
] as const;

/** 小丑兽额头红三角在立绘中的位置（百分比） */
const CALUMON_TRIANGLE = { left: 58.6, top: 42.7 };

function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "dusk";
  return "night";
}

/**
 * 首页片头：分层关键视觉。
 *  天空（按访客当地时间切换昼 / 黄昏 / 夜）→ 天台栏杆 → 标题 → 搭档 → 小丑兽 / D-Ark
 * 鼠标移动时各层按深度视差；标题夹在天台与搭档之间，会被搭档挡住一部分。
 * 进化：小丑兽（催化剂）或 D-Ark 屏幕触发，小妖兽 → 魔王兽 → 爆炸形态。
 */
export function HeroScene({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const timers = useRef<number[]>([]);
  const reduceMotion = useRef(false);
  const [tod, setTod] = useState<TimeOfDay>("dusk");
  const [stageIndex, setStageIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [evolvedOnce, setEvolvedOnce] = useState(false);
  const [clock, setClock] = useState("--:--");

  const form = MY_PARTNER[stageIndex];
  const art = PARTNER_ART[stageIndex];

  useEffect(() => {
    setTod(timeOfDay(new Date().getHours()));
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      );
    tick();
    const clockId = window.setInterval(tick, 30_000);
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pending = timers.current;
    return () => {
      window.clearInterval(clockId);
      pending.forEach((id) => window.clearTimeout(id));
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || reduceMotion.current) return;
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    if (frame.current) window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      root.style.setProperty("--mx", x.toFixed(3));
      root.style.setProperty("--my", y.toFixed(3));
    });
  }

  function handlePointerLeave() {
    rootRef.current?.style.setProperty("--mx", "0");
    rootRef.current?.style.setProperty("--my", "0");
  }

  function evolve() {
    if (phase !== "idle") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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

  const depth = (value: number) => ({ "--depth": value }) as CSSProperties;

  return (
    <div
      ref={rootRef}
      className="kv"
      data-tod={tod}
      data-stage={form.stage.id}
      data-phase={phase}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="kv-layer kv-sky" style={depth(6)} aria-hidden="true">
        <Image
          key={tod}
          src={SKY[tod]}
          alt=""
          fill
          priority
          sizes="100vw"
          className="kv-sky__img"
        />
      </div>

      <div className="kv-layer kv-rooftop" style={depth(16)} aria-hidden="true">
        <Image
          src="/digimon/hero/rooftop.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="kv-rooftop__img"
        />
      </div>

      {/* 左侧压暗（白天提亮），让文字直接写在画面上 */}
      <div className="kv-scrim" aria-hidden="true" />

      <div className="kv-copy">{children}</div>

      {/* 设定稿式的裁切对位标记与场记 */}
      <div className="kv-frame" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <p className="kv-slate font-mono" aria-hidden="true">
        EP.01 · SHINJUKU ROOFTOP · {clock}
      </p>

      <div className="kv-layer kv-partner-layer" style={depth(30)}>
        <div className="kv-partner" data-pose={art.pose}>
          <Image
            key={art.src}
            src={art.src}
            alt={`${form.name}（${form.stage.zh}）`}
            width={art.width}
            height={art.height}
            priority={stageIndex === 0}
            sizes="(max-width: 768px) 70vw, 560px"
            className={`kv-partner__art ${evolvedOnce ? "is-arrived" : ""}`}
          />
          <span className="kv-partner__burst" aria-hidden="true" />
          <span className="kv-evo font-pixel-latin" aria-hidden="true">
            EVOLUTION<i>_</i>
          </span>

          <button
            type="button"
            className="calumon"
            onClick={evolve}
            aria-label="小丑兽：点我让搭档进化"
          >
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
            <span className="calumon__beam" aria-hidden="true" />
            <span className="calumon__bubble" aria-hidden="true">
              {phase === "idle" ? "クル～ 点我进化！" : "进化吧！"}
            </span>
          </button>

          <span className="kv-partner__caption font-mono" aria-live="polite">
            PARTNER · {form.name} · {form.stage.en}
          </span>
        </div>
      </div>

      <div className="kv-evo-streak" aria-hidden="true" />

      <div className="kv-layer kv-device" style={depth(40)}>
        <TamerDevice
          form={form}
          evolving={phase === "burst" || phase === "arrive"}
          onEvolve={evolve}
        />
      </div>
    </div>
  );
}
