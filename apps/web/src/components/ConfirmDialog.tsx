import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Modal } from "./Modal.js";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | undefined>(undefined);

  const confirm = useCallback<ConfirmFn>(
    (o) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = undefined;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={opts !== null} onClose={() => close(false)} className="max-w-sm" labelledBy="confirm-title">
        {opts && (
          <div className="p-5">
            <h2 id="confirm-title" className="display text-lg font-semibold">{opts.title}</h2>
            {opts.message && <p className="mt-2 text-sm text-ink-300">{opts.message}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => close(false)}>
                {opts.cancelLabel ?? "Cancel"}
              </button>
              <button
                className={opts.danger ? "btn-danger" : "btn-primary"}
                onClick={() => close(true)}
                autoFocus
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}
