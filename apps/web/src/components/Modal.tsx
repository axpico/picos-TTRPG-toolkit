import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind width class for the panel. */
  className?: string;
  /** Vertical alignment of the panel. "bottom" renders a slide-up sheet. */
  align?: "center" | "top" | "bottom";
  labelledBy?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Lightweight portal modal: dimmed backdrop, Esc to close, click-outside to
 *  close. Moves focus into the panel on open, traps Tab inside it and returns
 *  focus to the previously focused element on close. */
export function Modal({ open, onClose, children, className, align = "center", labelledBy }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    // Focus the first focusable control, falling back to the panel itself.
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const firstEl = focusables[0]!;
      const lastEl = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || active === panelRef.current)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isBottom = align === "bottom";

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm",
        isBottom ? "items-end justify-center" : "justify-center p-4",
        align === "center" && "items-center",
        align === "top" && "items-start pt-[12vh]",
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={clsx(
          "card w-full overflow-auto shadow-2xl focus:outline-none",
          isBottom
            ? "max-h-[85vh] rounded-b-none p-0 animate-[sheetUp_0.18s_ease-out]"
            : "max-h-[85vh] p-0 animate-[fadeIn_0.12s_ease-out]",
          className ?? "max-w-md",
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
