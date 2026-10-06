import { useId, type ReactNode } from "react";

/**
 * D-Ark（Takato 版）矢量建模，参照官方设定图：
 * 银白机身、顶部斜切肩、红色粗圆环包着黑框方形液晶、
 * 圆形按键盘配两颗红色胶囊键与一颗橙色小键、
 * 左侧握把、右侧竖向卡槽（卡片自上而下刷过）、顶部接口盖与红色挂绳。
 *
 * viewBox 为 0 -70 200 320；屏幕与卡槽位置以百分比导出，供 HTML 叠层定位。
 */

export const DARK_VIEWBOX = { x: 0, y: -70, width: 200, height: 320 };

/** 屏幕在整体中的百分比位置 */
export const DARK_SCREEN = {
  left: 34,
  top: 36.875,
  width: 32,
  height: 20,
};

/** 右侧卡槽缝隙在整体中的百分比位置 */
export const DARK_SLOT = {
  x: 90,
  top: 35,
  bottom: 59.4,
};

export function DArk({
  className = "",
  screen,
}: {
  className?: string;
  /** 叠在液晶屏上的内容 */
  screen?: ReactNode;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const body = `darc-body-${id}`;
  const metal = `darc-metal-${id}`;
  const ring = `darc-ring-${id}`;
  const lcd = `darc-lcd-${id}`;
  const { x, y, width, height } = DARK_VIEWBOX;

  return (
    <div className={`darc ${className}`}>
      <svg
        className="darc__svg"
        viewBox={`${x} ${y} ${width} ${height}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#eef0f6" />
            <stop offset="1" stopColor="#c9cedd" />
          </linearGradient>
          <linearGradient id={metal} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8d93a8" />
            <stop offset="0.45" stopColor="#d6d9e4" />
            <stop offset="1" stopColor="#7d8399" />
          </linearGradient>
          <radialGradient id={ring} cx="0.4" cy="0.35" r="0.75">
            <stop offset="0" stopColor="var(--darc-ring-light, #ff5a4f)" />
            <stop offset="1" stopColor="var(--darc-ring, #c8102e)" />
          </radialGradient>
          <linearGradient id={lcd} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9f1fb" />
            <stop offset="1" stopColor="#9fd2ea" />
          </linearGradient>
        </defs>

        {/* 挂绳与登山扣 */}
        <g className="darc__strap">
          <path
            d="M94 -50 C 92 -62, 108 -62, 106 -50"
            fill="none"
            stroke="#1a1b24"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect x="91" y="-52" width="18" height="16" rx="4" fill="#24262f" stroke="#0b0c12" strokeWidth="2" />
          <path d="M88 -38 L112 -38 L113 14 L87 14 Z" fill="var(--darc-ring, #c8102e)" stroke="#0b0c12" strokeWidth="2.5" />
          <path d="M92 -34 L95 10" stroke="rgb(255 255 255 / 35%)" strokeWidth="2" />
        </g>

        {/* 左侧握把 */}
        <path
          d="M30 40 L18 48 Q12 80 18 112 L30 120 Z"
          fill={`url(#${metal})`}
          stroke="#0b0c12"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* 右侧卡槽外壳 */}
        <path
          d="M170 34 L184 42 Q190 80 184 122 L170 128 Z"
          fill={`url(#${metal})`}
          stroke="#0b0c12"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* 机身 */}
        <path
          d="M46 14 L154 14 L172 28 L176 118 Q176 132 166 142 L152 158 Q146 166 146 178 L146 214 Q146 242 118 244 L82 244 Q54 242 54 214 L54 178 Q54 166 48 158 L34 142 Q24 132 24 118 L28 28 Z"
          fill={`url(#${body})`}
          stroke="#0b0c12"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M50 20 L150 20 L164 31"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* 卡槽缝 */}
        <rect className="darc__slit" x="178.5" y="42" width="3" height="78" rx="1.5" />

        {/* 顶部接口盖 */}
        <rect x="86" y="8" width="28" height="9" rx="3" fill={`url(#${metal})`} stroke="#0b0c12" strokeWidth="2" />

        {/* 红色圆环 + 黑框 + 液晶 */}
        <circle cx="100" cy="80" r="61" fill={`url(#${ring})`} stroke="#0b0c12" strokeWidth="3" />
        <path
          d="M58 52 A 52 52 0 0 1 128 36"
          fill="none"
          stroke="rgb(255 255 255 / 45%)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="100" cy="80" r="49" fill="#15161d" stroke="#0b0c12" strokeWidth="2" />
        <rect x="68" y="48" width="64" height="64" rx="3" fill={`url(#${lcd})`} stroke="#0b0c12" strokeWidth="2" />

        {/* 橙色小键 */}
        <circle cx="62" cy="154" r="5.5" fill="#f39a1e" stroke="#0b0c12" strokeWidth="2" />
        <circle cx="60.5" cy="152.5" r="1.6" fill="#ffd79a" />

        {/* 圆形按键盘 */}
        <circle cx="100" cy="198" r="30" fill="#e7e9f1" stroke="#7d8399" strokeWidth="2.5" />
        <circle cx="100" cy="198" r="20" fill="none" stroke="#a3a8bc" strokeWidth="2" />
        <circle cx="100" cy="198" r="9" fill="#f6f7fb" stroke="#a3a8bc" strokeWidth="2" />

        {/* 红色胶囊键 */}
        <ellipse
          cx="78"
          cy="190"
          rx="14"
          ry="7"
          transform="rotate(-28 78 190)"
          fill="var(--darc-ring, #c8102e)"
          stroke="#0b0c12"
          strokeWidth="2.5"
        />
        <ellipse
          cx="122"
          cy="206"
          rx="14"
          ry="7"
          transform="rotate(-28 122 206)"
          fill="var(--darc-ring, #c8102e)"
          stroke="#0b0c12"
          strokeWidth="2.5"
        />
      </svg>

      <div
        className="darc__screen"
        style={{
          left: `${DARK_SCREEN.left}%`,
          top: `${DARK_SCREEN.top}%`,
          width: `${DARK_SCREEN.width}%`,
          height: `${DARK_SCREEN.height}%`,
        }}
      >
        {screen}
      </div>
    </div>
  );
}
