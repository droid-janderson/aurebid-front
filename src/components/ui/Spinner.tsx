import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Spinner({
  className,
  label = 'Carregando',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      className={cn('inline-flex items-center gap-2 text-mist', className)}
    >
      <Loader2 aria-hidden="true" className="size-4 animate-spin text-gold" />
      <span className="text-sm">{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Preparando a casa de leilões' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative flex size-14 items-center justify-center rounded-2xl border border-gold/25 bg-gold/5">
        <span className="font-display text-2xl text-gold">A</span>
        <span className="absolute inset-0 animate-ping rounded-2xl border border-gold/10" />
      </div>
      <p className="text-sm text-mist">{label}</p>
    </div>
  );
}
