"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MermaidZoomableProps = {
  svg: string;
};

const MIN_SCALE = 0.6;
const MAX_SCALE = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function MermaidZoomable({ svg }: MermaidZoomableProps) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const touchRef = useRef<
    | {
        mode: "pan";
        startX: number;
        startY: number;
        startTranslate: { x: number; y: number };
      }
    | {
        mode: "pinch";
        startDistance: number;
        startScale: number;
      }
    | null
  >(null);

  const transform = useMemo(
    () => `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
    [translate, scale],
  );

  const resetView = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    translateRef.current = translate;
  }, [translate]);

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
        onClick={() => {
          resetView();
          setOpen(true);
        }}
        aria-label="放大查看 Mermaid 图"
      >
        <span className="mermaid-zoomable-hint">点击放大</span>
        <span dangerouslySetInnerHTML={{ __html: svg }} />
      </button>

      {open && (
        <div className="mermaid-lightbox" onClick={() => setOpen(false)}>
          <div className="mermaid-lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setScale((v) => clamp(v - 0.15, MIN_SCALE, MAX_SCALE))}>
              -
            </button>
            <button type="button" onClick={() => setScale((v) => clamp(v + 0.15, MIN_SCALE, MAX_SCALE))}>
              +
            </button>
            <button type="button" onClick={resetView}>100%</button>
            <button type="button" onClick={() => setOpen(false)}>关闭</button>
          </div>

          <div
            className="mermaid-lightbox-stage"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={resetView}
            onWheel={(event) => {
              event.preventDefault();
              const delta = event.deltaY > 0 ? -0.1 : 0.1;
              setScale((v) => clamp(v + delta, MIN_SCALE, MAX_SCALE));
            }}
            onPointerDown={(event) => {
              dragRef.current = { x: event.clientX, y: event.clientY, active: true };
            }}
            onPointerMove={(event) => {
              if (!dragRef.current?.active) return;
              const dx = event.clientX - dragRef.current.x;
              const dy = event.clientY - dragRef.current.y;
              dragRef.current = { x: event.clientX, y: event.clientY, active: true };
              setTranslate((p) => ({ x: p.x + dx, y: p.y + dy }));
            }}
            onPointerUp={() => {
              if (dragRef.current) dragRef.current.active = false;
            }}
            onPointerCancel={() => {
              if (dragRef.current) dragRef.current.active = false;
            }}
            onTouchStart={(event) => {
              if (event.touches.length === 2) {
                event.preventDefault();
                const a = event.touches.item(0);
                const b = event.touches.item(1);
                if (!a || !b) return;
                const startDistance = Math.hypot(
                  a.clientX - b.clientX,
                  a.clientY - b.clientY,
                );
                touchRef.current = {
                  mode: "pinch",
                  startDistance,
                  startScale: scaleRef.current,
                };
                return;
              }

              if (event.touches.length === 1) {
                const finger = event.touches.item(0);
                if (!finger) return;
                touchRef.current = {
                  mode: "pan",
                  startX: finger.clientX,
                  startY: finger.clientY,
                  startTranslate: { ...translateRef.current },
                };
              }
            }}
            onTouchMove={(event) => {
              if (!touchRef.current) return;

              if (touchRef.current.mode === "pinch" && event.touches.length === 2) {
                event.preventDefault();
                const a = event.touches.item(0);
                const b = event.touches.item(1);
                if (!a || !b) return;
                const nextDistance = Math.hypot(
                  a.clientX - b.clientX,
                  a.clientY - b.clientY,
                );
                const ratio = nextDistance / touchRef.current.startDistance;
                setScale(clamp(touchRef.current.startScale * ratio, MIN_SCALE, MAX_SCALE));
                return;
              }

              if (touchRef.current.mode === "pan" && event.touches.length === 1) {
                event.preventDefault();
                const finger = event.touches.item(0);
                if (!finger) return;
                const dx = finger.clientX - touchRef.current.startX;
                const dy = finger.clientY - touchRef.current.startY;
                setTranslate({
                  x: touchRef.current.startTranslate.x + dx,
                  y: touchRef.current.startTranslate.y + dy,
                });
              }
            }}
            onTouchEnd={(event) => {
              if (event.touches.length === 0) {
                touchRef.current = null;
                return;
              }

              if (event.touches.length === 1) {
                const finger = event.touches.item(0);
                if (!finger) return;
                touchRef.current = {
                  mode: "pan",
                  startX: finger.clientX,
                  startY: finger.clientY,
                  startTranslate: { ...translateRef.current },
                };
              }
            }}
          >
            <div
              className="mermaid-lightbox-content"
              style={{ transform }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      )}
    </>
  );
}
