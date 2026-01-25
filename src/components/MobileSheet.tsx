"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

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
  heightClassName = "h-[85vh]",
}: MobileSheetProps) => {
  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(open);

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
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
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
        <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>
        {footer && <div className="p-5 pt-4">{footer}</div>}
      </div>
    </div>
  );
};
