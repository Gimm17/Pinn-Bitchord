import { create } from 'zustand';
import { useEffect } from 'react';
import { Check, Info } from 'lucide-react';

interface ToastState {
  message: string | null;
  id: number;
  showToast: (message: string, durationMs?: number) => void;
  hideToast: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>()((set) => ({
  message: null,
  id: 0,
  showToast: (message: string, durationMs = 2800) => {
    clearTimeout(toastTimer);
    set((s) => ({ message, id: s.id + 1 }));
    toastTimer = setTimeout(() => {
      set({ message: null });
    }, durationMs);
  },
  hideToast: () => {
    clearTimeout(toastTimer);
    set({ message: null });
  },
}));

export function showToast(message: string, durationMs?: number) {
  useToast.getState().showToast(message, durationMs);
}

export function ToastContainer() {
  const message = useToast((s) => s.message);
  const hideToast = useToast((s) => s.hideToast);

  if (!message) return null;

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[calc(var(--z-contextual-menus)+10)] animate-menu-in pointer-events-auto cursor-pointer"
      onClick={hideToast}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 rounded-full bg-thick-material px-4 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.4),0_0_0_0.5px_var(--vibrantDivider)] [backdrop-filter:blur(30px)_saturate(2)] type-callout border border-border-subtle text-primary">
        <span className="grid size-5 place-items-center rounded-full bg-key text-on-accent text-xs">
          <Check size={12} strokeWidth={3} />
        </span>
        <span className="max-w-[340px] truncate font-medium">{message}</span>
      </div>
    </div>
  );
}
