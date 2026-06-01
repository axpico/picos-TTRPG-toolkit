import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

export type ToastKind = "info" | "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}
export type ToastFn = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

const DURATION_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback<ToastFn>((message, kind = "info") => {
    const id = ++idRef.current;
    setItems((cur) => [...cur, { id, message, kind }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
          {items.map((t) => (
            <div
              key={t.id}
              role="status"
              className={clsx(
                "pointer-events-auto card px-4 py-2 text-sm shadow-xl animate-[toastIn_0.15s_ease-out]",
                t.kind === "success" && "border-accent-500/50",
                t.kind === "error" && "border-red-500/60",
              )}
            >
              <span
                className={clsx(
                  t.kind === "error" && "text-red-300",
                  t.kind === "success" && "text-accent-400",
                )}
              >
                {t.message}
              </span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
