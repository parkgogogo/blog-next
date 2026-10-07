"use client";

import { useEffect, useRef, useState } from "react";

/** 在 HTML 解析阶段同步执行：减少动态效果时，首帧前就隐藏开场 */
export const COLD_OPEN_GUARD = `(function(){try{var e=document.querySelector('.cold-open');if(!e)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches){e.setAttribute('data-play','false')}}catch(_){}})();`;
/** 开场总时长（毫秒），与 CSS 时间线一致 */
const DURATION = 2300;

function binaryColumn(seed: number, length: number): string {
  let state = seed >>> 0;
  let out = "";
  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state ^ (state >>> 13), 1274126177) + 1) >>> 0;
    out += state % 2 ? "1" : "0";
  }
  return out;
}

const SIDE_COLUMNS = Array.from({ length: 4 }, (_, index) => binaryColumn(index + 7, 48));

/**
 * 首页冷开场：致敬「EVO」开场。
 * 深紫墨底上打出 EVOLUTION_ → 横向光带炸开 → 白闪 → 绿色数据流中显影首屏 →
 * 两侧数据柱收拢成首屏的裁切对位线。
 *
 * 每次打开首页都播放；点击 / 按键跳过；减少动态效果时不播放。
 * 时间线完全由 CSS 驱动，没有 JS 时也会按时自动消失。
 */
export function ColdOpen() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDone(true);
      return;
    }

    // 数据雨：只在显影阶段绘制
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    let frame = 0;
    const startedAt = performance.now();

    if (canvas && ctx) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.scale(dpr, dpr);
      const size = Math.max(14, Math.round(window.innerWidth / 70));
      const columns = Math.ceil(window.innerWidth / size);
      const drops = Array.from({ length: columns }, () => Math.random() * -40);
      ctx.font = `${size}px ui-monospace, monospace`;

      const draw = (now: number) => {
        const t = now - startedAt;
        if (t > DURATION) return;
        ctx.fillStyle = "rgb(4 20 12 / 18%)";
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        if (t > 1050) {
          for (let index = 0; index < columns; index += 1) {
            const y = drops[index] * size;
            ctx.fillStyle = Math.random() > 0.92 ? "#e8fff0" : "#3dff8a";
            ctx.fillText(Math.random() > 0.5 ? "1" : "0", index * size, y);
            drops[index] += 1.6 + (index % 3) * 0.5;
          }
        }
        frame = window.requestAnimationFrame(draw);
      };
      frame = window.requestAnimationFrame(draw);
    }

    const skip = () => setDone(true);
    const timer = window.setTimeout(skip, DURATION);
    window.addEventListener("keydown", skip, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", skip);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="cold-open"
      data-play="true"
      aria-hidden="true"
      // 减少动态效果时由紧随其后的内联脚本在首帧前改成 false，避免黑屏闪一下
      suppressHydrationWarning
      onClick={() => setDone(true)}
    >
      <canvas ref={canvasRef} className="cold-open__rain" />
      <div className="cold-open__tint" />
      <div className="cold-open__columns">
        {SIDE_COLUMNS.map((column, index) => (
          <span key={index} className={`cold-open__column cold-open__column--${index}`}>
            {column}
          </span>
        ))}
      </div>
      <div className="cold-open__screen">
        <p className="cold-open__type font-pixel-latin">
          <span className="cold-open__word">EVOLUTION</span>
          <span className="cold-open__cursor">_</span>
        </p>
        <p className="cold-open__slate font-mono">EP.01 · SHINJUKU ROOFTOP</p>
      </div>
      <div className="cold-open__streak" />
      <div className="cold-open__flash" />
      <p className="cold-open__skip font-mono">CLICK TO SKIP</p>
    </div>
  );
}
