import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { FeedbackTone } from '@/utils/errors';

interface ToastInput {
  title: string;
  description?: string;
  tone?: FeedbackTone;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  push: (toast: ToastInput) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const tones: Record<FeedbackTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'border-win/35 text-win' },
  error: { icon: XCircle, className: 'border-loss/40 text-loss' },
  warning: { icon: AlertTriangle, className: 'border-gold/40 text-gold' },
  info: { icon: Info, className: 'border-info/35 text-info' },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, className } = tones[item.tone ?? 'info'];

  useEffect(() => {
    const timer = window.setTimeout(
      () => onDismiss(item.id),
      item.duration ?? 6000,
    );
    return () => window.clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line bg-elevated/95 p-3.5 shadow-panel backdrop-blur-md animate-rise',
        'border-l-2',
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-semibold text-chalk">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-mist">
            {item.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="-m-1 rounded-md p-1 text-mist-dim transition-colors hover:bg-white/5 hover:text-chalk"
        aria-label="Fechar notificação"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((input: ToastInput) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current.slice(-3), { ...input, id }]);
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(92vw,23rem)] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} item={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast precisa estar dentro de ToastProvider.');
  }
  return context;
}
