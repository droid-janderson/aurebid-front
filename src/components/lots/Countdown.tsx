import { Clock } from 'lucide-react';
import { formatCountdown, formatCountdownCompact } from '@/utils/datetime';
import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/utils/cn';

export function Countdown({
  target,
  enabled = true,
  variant = 'default',
  className,
}: {
  target: string | null | undefined;
  enabled?: boolean;
  variant?: 'default' | 'compact' | 'large';
  className?: string;
}) {
  const parts = useCountdown(target, enabled);

  if (variant === 'large') {
    const units = [
      { label: 'dias', value: parts.days },
      { label: 'horas', value: parts.hours },
      { label: 'min', value: parts.minutes },
      { label: 'seg', value: parts.seconds },
    ];

    return (
      <div
        className={cn('flex items-end gap-3', className)}
        role="timer"
        aria-live="off"
        aria-label={
          parts.expired
            ? 'Leilão encerrado'
            : `Tempo restante: ${formatCountdown(parts)}`
        }
      >
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <span className="numeric min-w-[2.2ch] text-center text-3xl font-medium text-chalk sm:text-4xl">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="mt-1 font-mono text-[0.5625rem] tracking-[0.16em] text-mist-dim uppercase">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'numeric inline-flex items-center gap-1.5 text-xs',
          parts.expired ? 'text-mist-dim' : 'text-mist',
          className,
        )}
        role="timer"
      >
        <Clock aria-hidden="true" className="size-3.5" />
        {formatCountdownCompact(parts)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'numeric inline-flex items-center gap-1.5 text-[0.8125rem]',
        parts.expired ? 'text-mist-dim' : 'text-chalk',
        className,
      )}
      role="timer"
      aria-label={`Tempo restante: ${formatCountdown(parts)}`}
    >
      <Clock aria-hidden="true" className="size-3.5 text-gold" />
      {formatCountdown(parts)}
    </span>
  );
}
