"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DigiAttribute } from "@/lib/digi";
import { DotSprite } from "./DotSprite";

export interface SlashPayload {
  href: string;
  attribute: DigiAttribute;
  digimonId: string;
  digimonName: string;
  title: string;
  stage: string;
  /** 被点击卡片在视口中的位置，用于“抽卡飞出” */
  from: DOMRect;
}

type SlashTrigger = (payload: SlashPayload) => void;

const CardSlashContext = createContext<SlashTrigger | null>(null);

export function useCardSlash(): SlashTrigger | null {
  return useContext(CardSlashContext);
}

/** 时间线（毫秒） */
const T = {
  /** 卡片飞到舞台中央并翻面 */
  stage: 540,
  /** 对准卡槽 */
  align: 800,
  /** 往上一提蓄力 */
  windup: 900,
  /** 自上而下刷过卡槽 */
  slash: 1060,
  /** 插件发动：卡片放大展示 */
  reveal: 1300,
  wipe: 2250,
  navigate: 2450,
};

/**
 * 动画画风 D-Ark 立绘（Codex image_gen 生成）中屏幕与卡槽缝的位置，百分比。
 * 由 scripts 处理时按像素检测得到。
 */
const DARC_SCREEN = { left: 34.6, top: 21.14, width: 30.81, height: 25.97 };
const DARC_SLIT = { x: 94.62, top: 23.9, bottom: 51.42 };

function SlashOverlay({
  payload,
  onSkip,
}: {
  payload: SlashPayload;
  onSkip: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const [slit, setSlit] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const device = deviceRef.current;
    if (!card || !device) return;

    // 量设备静止的外层容器，按立绘中的像素位置换算出卡槽缝
    const shell = device.getBoundingClientRect();
    const slitX = shell.left + (shell.width * DARC_SLIT.x) / 100;
    const slitTop = shell.top + (shell.height * DARC_SLIT.top) / 100;
    const slitBottom = shell.top + (shell.height * DARC_SLIT.bottom) / 100;
    setSlit({ x: slitX, y: (slitTop + slitBottom) / 2 });

    const W = card.offsetWidth;
    const H = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 以卡片中心定位（transform-origin: center）
    const at = (cx: number, cy: number) =>
      `perspective(1200px) translate(${cx - W / 2}px, ${cy - H / 2}px)`;

    const { from } = payload;
    const fromScale = Math.min(from.width / W, from.height / H);
    const fromC = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
    const stageC = { x: vw * 0.5 + Math.min(vw * 0.16, 240), y: vh * 0.47 };
    // 卡片竖握，左侧长边（磁条）卡进卡槽
    const slotCx = slitX - W * 0.1 + W / 2;
    const insertCy = slitTop - H / 2 + H * 0.16;
    const endCy = slitBottom + H / 2 + 24;

    const total = T.slash;
    card.animate(
      [
        {
          transform: `${at(fromC.x, fromC.y)} scale(${fromScale}) rotateZ(0deg) rotateY(180deg)`,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        },
        {
          offset: 0.18,
          transform: `${at(fromC.x * 0.6 + stageC.x * 0.4, fromC.y * 0.4 + stageC.y * 0.6 - 60)} scale(1.05) rotateZ(-10deg) rotateY(180deg)`,
          easing: "cubic-bezier(0.3, 0, 0.2, 1)",
        },
        {
          // 舞台中央翻面亮出卡面
          offset: T.stage / total,
          transform: `${at(stageC.x, stageC.y)} scale(1.22) rotateZ(4deg) rotateY(0deg)`,
          easing: "cubic-bezier(0.5, 0, 0.2, 1)",
        },
        {
          offset: T.align / total,
          transform: `${at(slotCx, insertCy - 40)} scale(1) rotateZ(0deg) rotateY(0deg)`,
          easing: "cubic-bezier(0.3, 0, 0.6, 1)",
        },
        {
          // 往上一提蓄力
          offset: T.windup / total,
          transform: `${at(slotCx, insertCy - 70)} scale(1, 1.03) rotateZ(0deg) rotateY(0deg)`,
          easing: "cubic-bezier(0.8, 0, 1, 0.6)",
        },
        {
          // 唰——自上而下刷过卡槽
          // 注意：卡片本身不能加 filter，否则会压平 3D、背面隐藏失效
          transform: `${at(slotCx, endCy)} scale(1, 1.12) rotateZ(0deg) rotateY(0deg) skewY(5deg)`,
        },
      ],
      { duration: total, fill: "forwards" }
    );

    card.animate([{ opacity: 1 }, { opacity: 0, translate: "0 180px" }], {
      delay: T.slash,
      duration: 220,
      easing: "ease-in",
      fill: "forwards",
    });
  }, [payload]);

  const cardFace = (
    <div className="slash-card__face slash-card__face--front">
      <span className="slash-card__stripe" />
      <span className="slash-card__name font-display-anime">{payload.digimonName}</span>
      <span className="slash-card__art">
        <Image
          src={`/digimon/cards/${payload.digimonId}.webp`}
          alt=""
          width={320}
          height={320}
          priority
        />
      </span>
      <span className="slash-card__title">{payload.title}</span>
      <span className="slash-card__shine" />
    </div>
  );

  return (
    <div
      className="slash-overlay"
      data-attribute={payload.attribute}
      role="dialog"
      aria-label={`Card Slash：${payload.title}`}
      onClick={onSkip}
    >
      <div className="slash-stage">
        <div className="slash-tunnel" aria-hidden="true" />
        <div className="slash-vignette" aria-hidden="true" />
        <div className="slash-lines" aria-hidden="true" />

        <div ref={cardRef} className="slash-card" aria-hidden="true">
          {cardFace}
          <div className="slash-card__face slash-card__face--back" />
        </div>

        <div ref={deviceRef} className="slash-device" aria-hidden="true">
          <div className="slash-device__rig">
            <Image
              src="/digimon/slash/darc.webp"
              alt=""
              width={720}
              height={832}
              priority
              className="slash-device__img"
            />
            <div
              className="slash-device__screen"
              style={{
                left: `${DARC_SCREEN.left}%`,
                top: `${DARC_SCREEN.top}%`,
                width: `${DARC_SCREEN.width}%`,
                height: `${DARC_SCREEN.height}%`,
              }}
            >
              <span className="darc-lcd__grid" />
              <DotSprite id={payload.digimonId} className="slash-device__sprite" />
              <span className="slash-device__flash" />
            </div>
          </div>
        </div>

        {slit && (
          <>
            <Image
              src="/digimon/slash/streak.webp"
              alt=""
              width={145}
              height={1100}
              priority
              aria-hidden="true"
              className="slash-streak"
              style={{ left: slit.x, top: slit.y }}
            />
            <span className="slash-shockwave" style={{ left: slit.x, top: slit.y }} aria-hidden="true" />
            <span
              className="slash-shockwave slash-shockwave--late"
              style={{ left: slit.x, top: slit.y }}
              aria-hidden="true"
            />
          </>
        )}

        <div className="slash-reveal" aria-hidden="true">
          <span className="slash-reveal__rays" />
          <div className="slash-reveal__card">{cardFace}</div>
        </div>

        <div className="slash-callout" aria-hidden="true">
          <span className="slash-callout__en font-display-anime">CARD SLASH!</span>
          <span className="slash-callout__jp">カードスラッシュ!!</span>
        </div>

        <div className="slash-plugin" aria-hidden="true">
          <span className="slash-plugin__tag">超進化プラグイン S</span>
          <span className="slash-plugin__title">
            {payload.digimonName} · {payload.stage}
          </span>
        </div>
      </div>

      <div className="slash-flash" aria-hidden="true" />
      <p className="slash-overlay__skip font-hud">CLICK TO SKIP</p>
      <div className="slash-overlay__wipe" aria-hidden="true" />
    </div>
  );
}

/**
 * 卡片刷入（Card Slash）：点击文章卡 → 数据隧道展开、抽卡翻面 →
 * 自上而下刷过 D-Ark 卡槽（光刃、白闪、冲击波）→「カードスラッシュ!」→
 * 插件发动、卡片放大展示 → 白光转场进入文章。
 * D-Ark、隧道、光刃与卡背由 Codex image_gen 二创，见 public/digimon/slash。
 */
export function CardSlashProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [payload, setPayload] = useState<SlashPayload | null>(null);
  const timers = useRef<number[]>([]);
  const navigated = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const go = useCallback(
    (href: string) => {
      if (navigated.current) return;
      navigated.current = true;
      clearTimers();
      router.push(href);
    },
    [clearTimers, router]
  );

  const trigger = useCallback<SlashTrigger>(
    (next) => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reduceMotion) {
        router.push(next.href);
        return;
      }

      router.prefetch(next.href);
      navigated.current = false;
      clearTimers();
      setPayload(next);
      timers.current.push(window.setTimeout(() => go(next.href), T.navigate));
    },
    [clearTimers, go, router]
  );

  // 路由切换完成后收起遮罩
  useEffect(() => {
    if (!payload || !navigated.current) return;
    const id = window.setTimeout(() => setPayload(null), 260);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!payload) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        go(payload.href);
      }
    };

    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [go, payload]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <CardSlashContext.Provider value={trigger}>
      {children}
      {payload && (
        <SlashOverlay payload={payload} onSkip={() => go(payload.href)} />
      )}
    </CardSlashContext.Provider>
  );
}
