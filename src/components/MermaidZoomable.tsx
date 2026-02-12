"use client";

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

export default function MermaidZoomable({ svg }: MermaidZoomableProps) {
  const [open, setOpen] = useState(false);
  const src = useMemo(() => toSvgDataUrl(svg), [svg]);

  return (
    <>
      <button
        type="button"
        className="mermaid-diagram mermaid-zoomable-trigger"
        onClick={() => setOpen(true)}
        aria-label="放大查看 Mermaid 图"
      >
        <span className="mermaid-zoomable-hint">点击放大</span>
        <span dangerouslySetInnerHTML={{ __html: svg }} />
      </button>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={[{ src, alt: "mermaid diagram" }]}
        plugins={[Zoom]}
        index={0}
        carousel={{ finite: true, preload: 0 }}
        controller={{ closeOnBackdropClick: true }}
        zoom={{ maxZoomPixelRatio: 4, wheelZoomDistanceFactor: 80, pinchZoomDistanceFactor: 80 }}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
      />
    </>
  );
}
