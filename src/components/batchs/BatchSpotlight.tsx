import { Link } from 'react-router-dom';
import { ArrowRight, Gavel } from 'lucide-react';
import type { Batch } from '@/types/domain';
import { CardImage } from '@/components/cards/CardImage';
import { Countdown } from '@/components/batchs/Countdown';
import { BatchStatusBadge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { formatBRL } from '@/utils/money';
import { cardSummaryLine, primaryCardImage } from '@/utils/product';
import { publicBatchCode } from '@/utils/pseudonym';
import { formatDateTime } from '@/utils/datetime';
import { useCountdown } from '@/hooks/useCountdown';

export function BatchSpotlight({ batch }: { batch: Batch }) {
  const image = primaryCardImage(batch);
  const summary = cardSummaryLine(batch);
  const active = batch.status === 'ACTIVE';
  const countdown = useCountdown(batch.endsAt, active);
  const endsSoon = active && !countdown.expired && countdown.totalMs < 3_600_000;

  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-line bg-[linear-gradient(135deg,rgba(24,32,43,0.92),rgba(11,15,21,0.9))]">
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-70" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-gold/[0.07] blur-3xl" aria-hidden="true" />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12 lg:p-10">
        <div className="art-glow mx-auto w-full max-w-[22rem] lg:mx-0">
          <CardImage
            src={image}
            alt={`Carta ${batch.title}`}
            className="aspect-[3/4] w-full animate-drift border-gold/20 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]"
            priority
          />
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex flex-wrap items-center gap-3">
            <BatchStatusBadge status={batch.status} />
            <span className="font-mono text-[0.625rem] tracking-[0.14em] text-mist-dim uppercase">
              Lote {publicBatchCode(batch.id)}
            </span>
            {endsSoon && (
              <span className="font-mono text-[0.625rem] tracking-[0.14em] text-gold uppercase">
                Última hora
              </span>
            )}
          </div>

          <p className="mt-5 font-mono text-[0.625rem] tracking-[0.18em] text-gold/80 uppercase">
            Destaque da casa {summary ? `· ${summary}` : ''}
          </p>
          <h2 className="display mt-2 text-[clamp(2rem,4.4vw,3.4rem)] text-chalk">
            {batch.title}
          </h2>

          <div className="mt-7 grid gap-6 border-y border-line/80 py-5 sm:grid-cols-2">
            <div>
              <p className="text-[0.6875rem] tracking-[0.1em] text-mist-dim uppercase">
                {batch.bidCount > 0 ? 'Maior lance' : 'Lance inicial'}
              </p>
              <p className="numeric mt-1 text-3xl font-medium text-gold-bright">
                {formatBRL(batch.currentPrice)}
              </p>
              <p className="mt-1 text-xs text-mist-dim">
                {batch.bidCount} {batch.bidCount === 1 ? 'lance registrado' : 'lances registrados'}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] tracking-[0.1em] text-mist-dim uppercase">
                {active ? 'Encerra em' : 'Encerrado em'}
              </p>
              {active ? (
                <Countdown target={batch.endsAt} variant="large" className="mt-1" />
              ) : (
                <p className="numeric mt-2 text-lg text-chalk">
                  {formatDateTime(batch.endsAt)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to={`/lotes/${batch.id}`}
              className={buttonStyles('primary', 'lg', 'w-full sm:w-auto')}
            >
              <Gavel aria-hidden="true" className="size-4" />
              {active ? 'Disputar este lote' : 'Ver resultado do lote'}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <p className="text-xs leading-relaxed text-mist-dim sm:max-w-[15rem]">
              Lances exigem saldo disponível em carteira. O servidor valida cada
              oferta e registra o histórico auditável.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
