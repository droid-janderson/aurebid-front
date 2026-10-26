import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'surface-soft flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-10' : 'py-16',
        className,
      )}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-line-strong bg-ink/50">
        <Icon aria-hidden="true" className="size-5 text-gold" />
      </span>
      <h3 className="font-display text-xl text-chalk">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-mist">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
