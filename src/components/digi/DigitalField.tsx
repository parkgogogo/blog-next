import type { CSSProperties } from "react";

function seeded(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const random = seeded(17);
  return Array.from({ length: 46 }, () => ({
    left: random() * 100,
    top: random() * 58,
    size: random() > 0.8 ? 3 : 2,
    delay: random() * 5,
  }));
})();

const PARTICLES = (() => {
  const random = seeded(99);
  return Array.from({ length: 22 }, () => ({
    left: 8 + random() * 84,
    delay: random() * 9,
    duration: 7 + random() * 7,
    size: random() > 0.7 ? 6 : 4,
  }));
})();

/**
 * 数码领域：新宿天空下展开的数据雾穹顶。
 * 地平线上的新宿街景由 hero 底部的跑酷游戏视差层绘制。
 */
export function DigitalField() {
  return (
    <div className="digi-field" aria-hidden="true">
      <div className="digi-field__sky" />
      {STARS.map((star, index) => (
        <span
          key={index}
          className="digi-star"
          style={
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              animationDelay: `${star.delay.toFixed(2)}s`,
            } as CSSProperties
          }
        />
      ))}

      <div className="digi-field__dome">
        <svg className="digi-field__hex" aria-hidden="true">
          <defs>
            <pattern
              id="digi-hex"
              width="28"
              height="48.5"
              patternUnits="userSpaceOnUse"
              patternTransform="scale(0.9)"
            >
              <path
                d="M14 0 L28 8.1 L28 24.2 L14 32.3 L0 24.2 L0 8.1 Z M14 32.3 L14 48.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#digi-hex)" />
        </svg>
        <span className="digi-field__ring" />
        <span className="digi-field__ring digi-field__ring--late" />
      </div>

      <div className="digi-field__scan" />

      {PARTICLES.map((particle, index) => (
        <span
          key={index}
          className="digi-particle"
          style={{
            left: `${particle.left}%`,
            width: particle.size,
            height: particle.size,
            animationDelay: `${particle.delay.toFixed(2)}s`,
            animationDuration: `${particle.duration.toFixed(2)}s`,
          }}
        />
      ))}

    </div>
  );
}
