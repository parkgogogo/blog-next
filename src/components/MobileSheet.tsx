"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const TRANSITION_MS = 280;

interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  panelClassName?: string;
  bodyClassName?: string;
  heightClassName?: string;
}

export const MobileSheet = ({
  open,
  onClose,
  ariaLabel = "Close sheet",
  header,
  children,
  footer,
  panelClassName = "",
  bodyClassName = "",
  heightClassName = "h-[65vh]",
}: MobileSheetProps) => {
  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(open);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setActive(true));
      return () => cancelAnimationFrame(id);
    }
    if (mounted) {
      setActive(false);
      const timeout = setTimeout(() => setMounted(false), TRANSITION_MS);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return undefined;
    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousHtmlOverscroll = documentElement.style.overscrollBehavior;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overscrollBehavior = "none";
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      body.style.overscrollBehavior = previousBodyOverscroll;
      documentElement.style.overflow = previousHtmlOverflow;
      documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleTouchStart = (event: TouchEvent) => {
      const body = bodyRef.current;
      if (!body) {
        touchStartY.current = null;
        return;
      }
      if (body.contains(event.target as Node)) {
        touchStartY.current = event.touches[0]?.clientY ?? null;
      } else {
        touchStartY.current = null;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      const body = bodyRef.current;
      if (!body) {
        event.preventDefault();
        return;
      }
      if (!body.contains(event.target as Node)) {
        event.preventDefault();
        return;
      }

      const startY = touchStartY.current;
      if (startY === null) return;

      const currentY = event.touches[0]?.clientY ?? startY;
      const delta = currentY - startY;
      const maxScrollTop = body.scrollHeight - body.clientHeight;

      if (maxScrollTop <= 0) {
        event.preventDefault();
        return;
      }

      if (delta > 0 && body.scrollTop <= 0) {
        event.preventDefault();
      }

      if (delta < 0 && body.scrollTop >= maxScrollTop) {
        event.preventDefault();
      }
    };

    const handleWheel = (event: WheelEvent) => {
      const body = bodyRef.current;
      if (!body) {
        event.preventDefault();
        return;
      }
      if (!body.contains(event.target as Node)) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("wheel", handleWheel);
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClose}
        className={`absolute inset-0 sheet-backdrop ${
          active ? "sheet-backdrop--open" : "sheet-backdrop--close"
        }`}
      />
      <div
        className={`relative z-10 w-full ${heightClassName} sheet-panel flex flex-col ${
          active ? "sheet-panel--open" : "sheet-panel--close"
        } ${panelClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        {header && <div className="p-5 pb-1">{header}</div>}
        <div
          ref={bodyRef}
          className={`flex-1 overflow-y-auto ${bodyClassName}`}
        >
          {children}
        </div>
        {footer && <div className="p-5 pt-4">{footer}</div>}
      </div>
    </div>
  );
};
