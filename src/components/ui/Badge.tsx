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

const solidTones: Record<BadgeTone, string> = {
  neutral: 'border-line-strong text-chalk',
  gold: 'border-gold/60 text-gold-bright',
  live: 'border-win/60 text-win',
  win: 'border-win/60 text-win',
  loss: 'border-loss/60 text-loss',
  info: 'border-info/60 text-info',
  muted: 'border-line-strong text-mist',
};

export type BadgeVariant = 'soft' | 'solid';

const softTypography = 'text-[0.625rem] font-medium tracking-[0.12em]';
const solidTypography = 'text-[0.6875rem] font-semibold tracking-[0.08em]';
const solidPlate =
  'bg-ink/85 shadow-[0_2px_10px_rgba(0,0,0,0.45)] backdrop-blur-md';

export function Badge({
  tone = 'neutral',
  variant = 'soft',
  children,
  dot = false,
  className,
}: {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono uppercase',
        variant === 'solid' ? solidTypography : softTypography,
        variant === 'solid' ? [solidPlate, solidTones[tone]] : tones[tone],
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
    <Badge
      tone={batchTones[status]}
      variant="solid"
      dot={status === 'ACTIVE'}
      className={className}
    >
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
