import { AlertTriangle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Algo saiu do curso',
  message,
  onRetry,
  retryLabel = 'Tentar novamente',
  action,
  compact = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'surface-soft flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-10' : 'py-16',
        className,
      )}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-loss/25 bg-loss/10">
        <AlertTriangle aria-hidden="true" className="size-5 text-loss" />
      </span>
      <h3 className="font-display text-xl text-chalk">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-mist">{message}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            leftIcon={<RotateCw aria-hidden="true" className="size-3.5" />}
          >
            {retryLabel}
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
