import { useEffect, type ReactNode } from "react";
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

/** Lightweight portal modal: dimmed backdrop, Esc to close, click-outside to close. */
export function Modal({ open, onClose, children, className, align = "center", labelledBy }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={clsx(
          "card w-full overflow-auto shadow-2xl",
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
