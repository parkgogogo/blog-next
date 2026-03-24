"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

type MermaidZoomableProps = {
  svg: string;
};

function toSvgDataUrl(svg: string): string {
  const normalized = svg
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalized)}`;
}

function parseSvgDimensions(svg: string): { width: number; height: number } {
  const viewBoxMatch = svg.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (viewBoxMatch) {
    const nums = viewBoxMatch[1]
      .trim()
      .split(/\s+/)
      .map((part) => Number(part));
    if (nums.length === 4 && nums[2] > 0 && nums[3] > 0) {
      return { width: nums[2], height: nums[3] };
    }
  }

  const widthMatch = svg.match(/width\s*=\s*"([0-9.]+)"/i);
  const heightMatch = svg.match(/height\s*=\s*"([0-9.]+)"/i);
  const width = widthMatch ? Number(widthMatch[1]) : 1200;
  const height = heightMatch ? Number(heightMatch[1]) : 800;
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1200,
    height: Number.isFinite(height) && height > 0 ? height : 800,
  };
}

export default function MermaidZoomable({ svg }: MermaidZoomableProps) {
  const [open, setOpen] = useState(false);
  const src = useMemo(() => toSvgDataUrl(svg), [svg]);
  const dimensions = useMemo(() => parseSvgDimensions(svg), [svg]);

  return (
    <>
      <button
        type="button"
        className="mermaid-diagram mermaid-zoomable-trigger"
        onClick={() => setOpen(true)}
        aria-label="放大查看 Mermaid 图"
      >
        <span className="mermaid-zoomable-hint">点击放大</span>
        <Image
          unoptimized
          src={src}
          alt="diagram"
          width={dimensions.width}
          height={dimensions.height}
          style={{ maxWidth: "100%", height: "auto" }}
        />
      </button>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={[
          {
            src,
            alt: "mermaid diagram",
            width: dimensions.width,
            height: dimensions.height,
          },
        ]}
        plugins={[Zoom]}
        index={0}
        carousel={{ finite: true, preload: 0 }}
        controller={{ closeOnBackdropClick: true }}
        zoom={{
          maxZoomPixelRatio: 4,
          wheelZoomDistanceFactor: 80,
          pinchZoomDistanceFactor: 80,
        }}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
      />
    </>
  );
}
