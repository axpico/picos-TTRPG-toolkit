import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind width class for the panel. */
  className?: string;
  /** Vertical alignment of the panel. */
  align?: "center" | "top";
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

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-50 flex justify-center bg-black/60 p-4 backdrop-blur-sm",
        align === "center" ? "items-center" : "items-start pt-[12vh]",
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
          "card max-h-[85vh] w-full overflow-auto p-0 shadow-2xl",
          "animate-[fadeIn_0.12s_ease-out]",
          className ?? "max-w-md",
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
