"use client";

import { useEffect, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

type MermaidZoomableProps = {
  svg: string;
};

export default function MermaidZoomable({ svg }: MermaidZoomableProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
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
            initialScale={1}
            minScale={0.6}
            maxScale={4}
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
                  className="mermaid-lightbox-stage"
                  onClick={(event) => event.stopPropagation()}
                >
                  <TransformComponent
                    wrapperClass="mermaid-lightbox-wrapper"
                    contentClass="mermaid-lightbox-content"
                  >
                    <div dangerouslySetInnerHTML={{ __html: svg }} />
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
