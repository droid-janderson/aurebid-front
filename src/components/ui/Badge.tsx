import type { ReactNode } from 'react';
import type { BatchStatus, SettlementStatus } from '@/types/domain';
import { batchStatusLabel, settlementStatusLabel } from '@/utils/labels';
import { cn } from '@/utils/cn';

export type BadgeTone =
  | 'neutral'
  | 'gold'
  | 'live'
  | 'win'
  | 'loss'
  | 'info'
  | 'muted';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-line-strong/70 bg-white/[0.03] text-mist',
  gold: 'border-gold/30 bg-gold/10 text-gold-bright',
  live: 'border-win/30 bg-win/10 text-win',
  win: 'border-win/30 bg-win/10 text-win',
  loss: 'border-loss/30 bg-loss/10 text-loss',
  info: 'border-info/30 bg-info/10 text-info',
  muted: 'border-line bg-transparent text-mist-dim',
};

export function Badge({
  tone = 'neutral',
  children,
  dot = false,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.625rem] font-medium tracking-[0.12em] uppercase',
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            'size-1.5 rounded-full bg-current',
            tone === 'live' && 'animate-pulse-dot',
          )}
        />
      )}
      {children}
    </span>
  );
}

const batchTones: Record<BatchStatus, BadgeTone> = {
  DRAFT: 'muted',
  SCHEDULED: 'info',
  ACTIVE: 'live',
  ENDED: 'neutral',
  SETTLED: 'gold',
  CANCELLED: 'loss',
};

export function BatchStatusBadge({
  status,
  className,
}: {
  status: BatchStatus;
  className?: string;
}) {
  return (
    <Badge tone={batchTones[status]} dot={status === 'ACTIVE'} className={className}>
      {batchStatusLabel[status]}
    </Badge>
  );
}

const settlementTones: Record<SettlementStatus, BadgeTone> = {
  PENDING: 'info',
  PROCESSING: 'gold',
  COMPLETED: 'win',
  FAILED: 'loss',
};

export function SettlementStatusBadge({
  status,
  className,
}: {
  status: SettlementStatus;
  className?: string;
}) {
  return (
    <Badge tone={settlementTones[status]} className={className}>
      {settlementStatusLabel[status]}
    </Badge>
  );
}
