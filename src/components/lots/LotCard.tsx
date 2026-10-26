import { Link } from 'react-router-dom';
import { ArrowUpRight, Gavel } from 'lucide-react';
import type { Lot } from '@/types/domain';
import { CardImage } from '@/components/cards/CardImage';
import { LotStatusBadge } from '@/components/ui/Badge';
import { Countdown } from '@/components/lots/Countdown';
import { formatBRL } from '@/utils/money';
import { cardSummaryLine, primaryCardImage } from '@/utils/product';
import { publicLotCode } from '@/utils/pseudonym';
import { cn } from '@/utils/cn';

export function LotCard({ lot, className }: { lot: Lot; className?: string }) {
  const image = primaryCardImage(lot);
  const summary = cardSummaryLine(lot);
  const ended = lot.status === 'ENDED' || lot.status === 'SETTLED';
  const timeLabel = ended ? 'Encerrado em' : lot.status === 'SCHEDULED' ? 'Abre em' : 'Termina em';

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-line bg-raised/60 transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_24px_60px_-38px_rgba(215,179,106,0.55)]',
        className,
      )}
    >
      <Link
        to={`/lotes/${lot.id}`}
        className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold-bright"
      >
        <div className="relative p-3 pb-0">
          <CardImage
            src={image}
            alt={`Carta ${lot.title}`}
            className="aspect-[3/4] w-full"
            imageClassName="transition-transform duration-500 group-hover:scale-[1.025]"
          />
          <div className="absolute top-5 left-5">
            <LotStatusBadge status={lot.status} />
          </div>
          <span className="absolute right-5 bottom-2 rounded-md border border-line bg-ink/80 px-1.5 py-0.5 font-mono text-[0.5625rem] tracking-[0.1em] text-mist-dim uppercase backdrop-blur">
            {publicLotCode(lot.id)}
          </span>
        </div>

        <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
          <p className="font-mono text-[0.5625rem] tracking-[0.14em] text-gold/80 uppercase">
            {summary || lot.productSource}
          </p>
          <h3 className="mt-1.5 line-clamp-2 font-display text-lg leading-snug text-chalk">
            {lot.title}
          </h3>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-line/70 pt-3">
            <div>
              <p className="text-[0.625rem] tracking-wide text-mist-dim uppercase">
                {lot.bidCount > 0 ? 'Lance atual' : 'Lance inicial'}
              </p>
              <p className="numeric mt-0.5 text-lg font-medium text-gold-bright">
                {formatBRL(lot.currentPrice)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.625rem] tracking-wide text-mist-dim uppercase">
                {timeLabel}
              </p>
              {ended ? (
                <span className="numeric text-xs text-mist">—</span>
              ) : (
                <Countdown
                  target={lot.status === 'SCHEDULED' ? lot.startsAt : lot.endsAt}
                  className="justify-end"
                />
              )}
            </div>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-line/70 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-mist-dim">
          <Gavel aria-hidden="true" className="size-3" />
          {lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}
        </span>
        <Link
          to={`/lotes/${lot.id}`}
          className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-mist transition-colors hover:text-gold"
          aria-label={`Abrir lote ${lot.title}`}
        >
          Ver lote
          <ArrowUpRight aria-hidden="true" className="size-3" />
        </Link>
      </div>
    </article>
  );
}
