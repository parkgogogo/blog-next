"use client";

import { useEffect, useState } from "react";
import { DIGI_STAGES } from "@/lib/digi";

const SEGMENTS = 24;

/**
 * 阅读进度 = 进化进度：读到底即为究极体。
 */
export function EvolutionGauge() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    function update() {
      frame = 0;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      // Safari's top-edge bounce can report a negative scrollY.
      setProgress(
        scrollable > 0
          ? Math.max(0, Math.min(1, window.scrollY / scrollable))
          : 0
      );
    }

    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const stageIndex = Math.min(
    DIGI_STAGES.length - 1,
    Math.floor(progress * DIGI_STAGES.length)
  );
  const stage = DIGI_STAGES[stageIndex];
  const filled = Math.round(progress * SEGMENTS);

  return (
    <div
      className="evo-gauge"
      data-stage={stage.id}
      role="progressbar"
      aria-label="阅读进度"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <span className="evo-gauge__label font-pixel-latin">EVO</span>
      <span className="evo-gauge__track" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <i key={index} className={index < filled ? "is-on" : undefined} />
        ))}
      </span>
      <span className="evo-gauge__stage">{stage.zh}</span>
    </div>
  );
}
