"use client";

import { useEffect, useRef, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

type MermaidZoomableProps = {
  svg: string;
};

const MIN_SCALE = 0.6;
const MAX_SCALE = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function MermaidZoomable({ svg }: MermaidZoomableProps) {
  const [open, setOpen] = useState(false);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const fitToVisibleContent = () => {
    const stage = stageRef.current;
    const container = contentRef.current;
    const api = transformRef.current;
    if (!stage || !container || !api) return;

    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    try {
      const bbox = svgEl.getBBox();
      if (!bbox.width || !bbox.height) return;

      const pad = Math.max(8, Math.min(bbox.width, bbox.height) * 0.04);
      const viewBox = {
        x: bbox.x - pad,
        y: bbox.y - pad,
        width: bbox.width + pad * 2,
        height: bbox.height + pad * 2,
      };

      svgEl.setAttribute(
        "viewBox",
        `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
      );
      svgEl.setAttribute("width", String(viewBox.width));
      svgEl.setAttribute("height", String(viewBox.height));

      const stageWidth = stage.clientWidth;
      const stageHeight = stage.clientHeight;
      if (!stageWidth || !stageHeight) return;

      const fittedScale = clamp(
        Math.min(stageWidth / viewBox.width, stageHeight / viewBox.height) * 0.96,
        MIN_SCALE,
        MAX_SCALE,
      );

      api.setTransform(0, 0, fittedScale, 120);
      api.centerView(fittedScale, 120);
    } catch {
      // Ignore invalid SVG bbox and keep default behavior.
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    let t2 = 0;
    const t1 = window.requestAnimationFrame(() => {
      t2 = window.requestAnimationFrame(() => {
        fitToVisibleContent();
      });
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      window.cancelAnimationFrame(t1);
      if (t2) window.cancelAnimationFrame(t2);
    };
  }, [open]);

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

      {open && (
        <div className="mermaid-lightbox" onClick={() => setOpen(false)}>
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={MIN_SCALE}
            maxScale={MAX_SCALE}
            centerOnInit
            doubleClick={{ mode: "reset" }}
            wheel={{ step: 0.15 }}
            panning={{ velocityDisabled: true }}
            pinch={{ step: 8 }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div
                  className="mermaid-lightbox-toolbar"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button type="button" onClick={() => zoomOut()}>
                    -
                  </button>
                  <button type="button" onClick={() => zoomIn()}>
                    +
                  </button>
                  <button type="button" onClick={() => resetTransform()}>
                    100%
                  </button>
                  <button type="button" onClick={() => setOpen(false)}>
                    关闭
                  </button>
                </div>

                <div
                  ref={stageRef}
                  className="mermaid-lightbox-stage"
                  onClick={(event) => event.stopPropagation()}
                >
                  <TransformComponent
                    wrapperClass="mermaid-lightbox-wrapper"
                    contentClass="mermaid-lightbox-content"
                  >
                    <div ref={contentRef} dangerouslySetInnerHTML={{ __html: svg }} />
                  </TransformComponent>
                </div>
              </>
            )}
          </TransformWrapper>
        </div>
      )}
    </>
  );
}
