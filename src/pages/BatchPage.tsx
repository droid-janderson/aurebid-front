import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  ExternalLink,
  Gavel,
  LayoutDashboard,
  Radio,
  ShieldCheck,
  User,
} from 'lucide-react';
import { batchsService } from '@/services/batchs.service';
import { queryKeys } from '@/services/query-keys';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';
import { useBatchRoom } from '@/realtime/useBatchRoom';
import { CardImage } from '@/components/cards/CardImage';
import { BatchStatusBadge } from '@/components/ui/Badge';
import { Countdown } from '@/components/batchs/Countdown';
import { BidPanel } from '@/components/batchs/BidPanel';
import { BidHistory } from '@/components/batchs/BidHistory';
import { SectionHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { Skeleton } from '@/components/ui/Skeleton';
import { buttonStyles } from '@/components/ui/Button';
import { cardAttributes, primaryCardImage } from '@/utils/product';
import { formatBRL } from '@/utils/money';
import { formatDateTime } from '@/utils/datetime';
import { presentError } from '@/utils/errors';
import { publicBatchCode } from '@/utils/pseudonym';
import { cn } from '@/utils/cn';

const connectionLabel: Record<string, string> = {
  idle: 'Sem conexão em tempo real',
  connecting: 'Conectando',
  connected: 'Ao vivo',
  disconnected: 'Reconectando',
  error: 'Sem sinal ao vivo',
};

export function BatchPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { user } = useAuth();
  const batchQuery = useQuery({
    queryKey: queryKeys.batchs.detail(batchId ?? ''),
    queryFn: () => batchsService.get(batchId!),
    enabled: Boolean(batchId),
  });

  const realtimeStatus = useBatchRoom(batchId, Boolean(batchId));
  useDocumentTitle(batchQuery.data?.title ?? 'Lote');

  if (!batchId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <ErrorState
          title="Lote não informado"
          message="O endereço deste lote está incompleto."
          action={
            <Link to="/" className={buttonStyles('secondary', 'sm')}>
              Voltar para a vitrine
            </Link>
          }
        />
      </div>
    );
  }

  if (batchQuery.isPending) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-32" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-8 sm:grid-cols-[0.9fr_1.1fr]">
            <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-4/5" />
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
          <Skeleton className="h-[32rem] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (batchQuery.isError || !batchQuery.data) {
    const error = presentError(batchQuery.error);
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <ErrorState
          title={error.title}
          message={error.message}
          onRetry={() => void batchQuery.refetch()}
          action={
            <Link to="/" className={buttonStyles('secondary', 'sm')}>
              Ver vitrine
            </Link>
          }
        />
      </div>
    );
  }

  const batch = batchQuery.data;
  const attributes = cardAttributes(batch);
  const raw = batch.productData ?? {};
  const condition =
    typeof raw.condition === 'string' ? raw.condition : undefined;
  const language = typeof raw.language === 'string' ? raw.language : undefined;
  const isSeller = user?.id === batch.sellerId;
  const connection = connectionLabel[realtimeStatus] ?? realtimeStatus;
  const live = realtimeStatus === 'connected';

  const specs = [
    attributes.setName ? { label: 'Coleção', value: attributes.setName } : null,
    attributes.number ? { label: 'Número', value: `#${attributes.number}` } : null,
    attributes.rarity ? { label: 'Raridade', value: attributes.rarity } : null,
    attributes.supertype ? { label: 'Categoria', value: attributes.supertype } : null,
    attributes.types.length > 0
      ? { label: 'Tipo', value: attributes.types.join(', ') }
      : null,
    condition ? { label: 'Condição', value: condition } : null,
    language ? { label: 'Idioma', value: language } : null,
    { label: 'Origem', value: batch.productSource },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-mist transition-colors hover:text-chalk"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Voltar para a vitrine
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-mono text-[0.625rem] tracking-[0.12em] uppercase',
              live ? 'text-win' : 'text-mist-dim',
            )}
            title="Status da conexão em tempo real"
          >
            <Radio
              aria-hidden="true"
              className={cn('size-3.5', live && 'animate-pulse-dot')}
            />
            {connection}
          </span>
          <Link
            to={`/lotes/${batch.id}/auditoria`}
            className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium text-mist transition-colors hover:text-gold"
          >
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Auditoria
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)] lg:gap-12">
        <div>
          <div className="grid gap-8 sm:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <div className="art-glow">
              <CardImage
                src={primaryCardImage(batch)}
                alt={`Carta ${batch.title}`}
                className="aspect-[3/4] w-full border-gold/20"
                priority
              />
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <BatchStatusBadge status={batch.status} />
                <span className="font-mono text-[0.625rem] tracking-[0.14em] text-mist-dim uppercase">
                  Lote {publicBatchCode(batch.id)}
                </span>
              </div>
              <h1 className="display mt-3 text-[clamp(2rem,4.5vw,3.2rem)] text-chalk">
                {batch.title}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-mist-dim">
                <User aria-hidden="true" className="size-3.5" />
                Leiloado por <span className="text-mist">{batch.seller.name}</span>
              </p>

              <div className="mt-6 flex items-end justify-between gap-4 border-y border-line/70 py-4">
                <div>
                  <p className="text-[0.625rem] tracking-[0.1em] text-mist-dim uppercase">
                    {batch.bidCount > 0 ? 'Maior lance' : 'Lance inicial'}
                  </p>
                  <p className="numeric mt-0.5 text-2xl font-medium text-gold-bright">
                    {formatBRL(batch.currentPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.625rem] tracking-[0.1em] text-mist-dim uppercase">
                    {batch.status === 'ACTIVE' ? 'Encerra em' : 'Encerrado em'}
                  </p>
                  {batch.status === 'ACTIVE' ? (
                    <Countdown target={batch.endsAt} className="mt-1" />
                  ) : (
                    <p className="numeric mt-1 text-xs text-mist">
                      {formatDateTime(batch.endsAt)}
                    </p>
                  )}
                </div>
              </div>

              {batch.description && (
                <p className="mt-5 text-sm leading-relaxed text-mist">
                  {batch.description}
                </p>
              )}

              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
                {specs.map((spec) => (
                  <div key={spec.label}>
                    <dt className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
                      {spec.label}
                    </dt>
                    <dd className="mt-0.5 truncate text-[0.8125rem] text-chalk">
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line/70 pt-4 text-[0.6875rem] text-mist-dim">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock aria-hidden="true" className="size-3.5" />
                  Início {formatDateTime(batch.startsAt)}
                </span>
                <Link
                  to={`/lotes/${batch.id}/auditoria`}
                  className="inline-flex items-center gap-1 font-medium text-gold transition-colors hover:text-gold-bright"
                >
                  Ver trilha de lances
                  <ArrowUpRight aria-hidden="true" className="size-3" />
                </Link>
              </div>

              {isSeller && (
                <div className="mt-5">
                  <InlineAlert tone="info" title="Você gerencia este lote">
                    Acompanhe a disputa ou ajuste o lote no painel do leiloeiro.
                    <div className="mt-2">
                      <Link
                        to={`/painel/lotes/${batch.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-bright"
                      >
                        <LayoutDashboard aria-hidden="true" className="size-3.5" />
                        Abrir gerenciamento
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </Link>
                    </div>
                  </InlineAlert>
                </div>
              )}
            </div>
          </div>

          <section className="mt-12" aria-labelledby="historico-title">
            <SectionHeader
              eyebrow="Registro"
              title="Histórico de lances"
              description="Os valores abaixo vêm do servidor. O hash e a sequência permitem conferir a integridade da trilha."
              action={
                <Link
                  to={`/lotes/${batch.id}/auditoria`}
                  className={buttonStyles('secondary', 'sm')}
                >
                  <ShieldCheck aria-hidden="true" className="size-3.5" />
                  Abrir auditoria
                </Link>
              }
            />
            <div id="historico-title" className="mt-5">
              <BidHistory batchId={batch.id} />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <BidPanel batch={batch} />

          <div className="surface-soft mt-4 p-4">
            <p className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-mist">
              <Gavel aria-hidden="true" className="size-3.5 text-gold" />
              Regras deste lote
            </p>
            <ul className="mt-2 space-y-1.5 text-[0.6875rem] leading-relaxed text-mist-dim">
              <li>Lance inicial de {formatBRL(batch.startingPrice)}.</li>
              <li>
                Cada novo lance precisa superar o atual em ao menos{' '}
                {formatBRL(batch.minimumIncrement)}.
              </li>
              <li>
                Lances exigem saldo disponível e ficam reservados até o
                encerramento.
              </li>
              <li>O relógio e a apuração são definidos pelo servidor.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
