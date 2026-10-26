import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import type { FeedbackTone } from '@/utils/errors';

const tones: Record<
  FeedbackTone,
  { icon: typeof Info; wrapper: string; iconClass: string }
> = {
  error: {
    icon: XCircle,
    wrapper: 'border-loss/30 bg-loss/[0.07]',
    iconClass: 'text-loss',
  },
  warning: {
    icon: AlertTriangle,
    wrapper: 'border-gold/30 bg-gold/[0.07]',
    iconClass: 'text-gold',
  },
  info: {
    icon: Info,
    wrapper: 'border-info/25 bg-info/[0.06]',
    iconClass: 'text-info',
  },
  success: {
    icon: CheckCircle2,
    wrapper: 'border-win/25 bg-win/[0.06]',
    iconClass: 'text-win',
  },
};

export function InlineAlert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: FeedbackTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const config = tones[tone];
  const Icon = config.icon;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3',
        config.wrapper,
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-4 shrink-0', config.iconClass)}
      />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-medium text-chalk">{title}</p>}
        <div className={cn('text-mist', title && 'mt-0.5 text-[0.8125rem]')}>
          {children}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
