import type { CSSProperties } from "react";

/**
 * D-Ark 液晶点阵：1-bit 精灵作为遮罩，颜色由 --lcd-ink 决定。
 */
export function DotSprite({
  id,
  className = "",
  style,
}: {
  id: string;
  className?: string;
  style?: CSSProperties;
}) {
  const url = `url(/digimon/dot/${id}.png)`;

  return (
    <span
      aria-hidden="true"
      className={`dot-sprite ${className}`}
      style={{ ...style, WebkitMaskImage: url, maskImage: url }}
    />
  );
}
