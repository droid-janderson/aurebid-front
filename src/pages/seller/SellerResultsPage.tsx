import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Clock,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import type { SettlementStatus } from '@/types/domain';
import { settlementsService } from '@/services/settlements.service';
import { queryKeys } from '@/services/query-keys';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettlementStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { CardImage } from '@/components/cards/CardImage';
import { formatBRL, fromCents, toCents } from '@/utils/money';
import { formatDateTime } from '@/utils/datetime';
import { presentError } from '@/utils/errors';
import { cn } from '@/utils/cn';

const tabs: Array<{ value: SettlementStatus | ''; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'COMPLETED', label: 'Concluídas' },
  { value: 'PENDING', label: 'Aguardando' },
  { value: 'PROCESSING', label: 'Em curso' },
  { value: 'FAILED', label: 'Falhas' },
];

export function SellerResultsPage() {
  useDocumentTitle('Resultados do leiloeiro');
  const { user } = useAuth();
  const [status, setStatus] = useState<SettlementStatus | ''>('');

  const query = useQuery({
    queryKey: queryKeys.settlements.mine,
    queryFn: () => settlementsService.listMine(1, 100),
    staleTime: 20_000,
  });

  const sold = useMemo(
    () =>
      (query.data?.data ?? []).filter(
        (settlement) => settlement.sellerId === user?.id,
      ),
    [query.data, user?.id],
  );

  const filtered = status
    ? sold.filter((settlement) => settlement.status === status)
    : sold;

  const totals = useMemo(() => {
    const receivedCents = sold
      .filter((settlement) => settlement.status === 'COMPLETED')
      .reduce((total, settlement) => total + toCents(settlement.amount), 0);
    const pendingCents = sold
      .filter(
        (settlement) =>
          settlement.status === 'PENDING' || settlement.status === 'PROCESSING',
      )
      .reduce((total, settlement) => total + toCents(settlement.amount), 0);

    return {
      received: fromCents(receivedCents),
      pending: fromCents(pendingCents),
      completed: sold.filter((s) => s.status === 'COMPLETED').length,
      open: sold.filter(
        (s) => s.status === 'PENDING' || s.status === 'PROCESSING',
      ).length,
      failed: sold.filter((s) => s.status === 'FAILED').length,
    };
  }, [sold]);

  const error = query.error ? presentError(query.error) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Resultados"
        title={
          <>
            Arremates <em>liquidados.</em>
          </>
        }
        description="Acompanhe cada lote vendido, o status da liquidação e o valor efetivamente creditado. Somente liquidações concluídas entram no total recebido."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void query.refetch()}
            loading={query.isFetching}
            leftIcon={<RefreshCw aria-hidden="true" className="size-3.5" />}
          >
            Atualizar
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="surface-soft p-4">
          <p className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
            Total recebido
          </p>
          <p className="numeric mt-1.5 text-xl font-medium text-win">
            {formatBRL(totals.received)}
          </p>
          <p className="mt-0.5 text-[0.625rem] text-mist-dim">
            {totals.completed} liquidações concluídas
          </p>
        </div>
        <div className="surface-soft p-4">
          <p className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
            Em aberto
          </p>
          <p className="numeric mt-1.5 text-xl font-medium text-gold-bright">
            {formatBRL(totals.pending)}
          </p>
          <p className="mt-0.5 text-[0.625rem] text-mist-dim">
            {totals.open} aguardando crédito
          </p>
        </div>
        <div className="surface-soft p-4">
          <p className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
            Arremates
          </p>
          <p className="numeric mt-1.5 text-xl font-medium text-chalk">
            {sold.length}
          </p>
          <p className="mt-0.5 text-[0.625rem] text-mist-dim">
            lotes com vencedor
          </p>
        </div>
        <div className="surface-soft p-4">
          <p className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
            Falhas
          </p>
          <p
            className={cn(
              'numeric mt-1.5 text-xl font-medium',
              totals.failed > 0 ? 'text-loss' : 'text-chalk',
            )}
          >
            {totals.failed}
          </p>
          <p className="mt-0.5 text-[0.625rem] text-mist-dim">
            liquidações com erro
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <div className="scroll-thin flex gap-1 overflow-x-auto rounded-lg border border-line bg-ink/40 p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={cn(
                'shrink-0 rounded-md px-3 py-1.5 text-[0.75rem] font-medium transition-colors',
                status === tab.value
                  ? 'bg-raised text-chalk'
                  : 'text-mist-dim hover:text-mist',
              )}
              aria-pressed={status === tab.value}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="ml-auto text-[0.6875rem] text-mist-dim">
          {filtered.length} de {sold.length} arremates
        </p>
      </div>

      <div className="mt-4">
        {query.isPending ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <ErrorState
            title={error.title}
            message={error.message}
            onRetry={() => void query.refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={sold.length === 0 ? Receipt : BadgeCheck}
            title={
              sold.length === 0
                ? 'Nenhum arremate registrado'
                : 'Nenhum resultado neste filtro'
            }
            description={
              sold.length === 0
                ? 'Quando um dos seus lotes for encerrado com lance vencedor, a liquidação aparecerá aqui.'
                : 'Troque o filtro para consultar outros status de liquidação.'
            }
            action={
              sold.length === 0 ? (
                <Link
                  to="/painel"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-bright"
                >
                  Ir para meus lotes
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((settlement) => (
              <li
                key={settlement.id}
                className="surface-soft flex flex-col gap-4 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <CardImage
                    src={settlement.lot?.imageUrl}
                    alt={`Carta ${settlement.lot?.title ?? 'arrematada'}`}
                    className="h-20 w-16 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-[0.5625rem] tracking-[0.12em] text-gold/80 uppercase">
                      {settlement.receiptNumber}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-chalk">
                      {settlement.lot?.title ?? 'Lote'}
                    </p>
                    <p className="mt-1 text-[0.6875rem] text-mist-dim">
                      Arrematado por {settlement.buyer?.name ?? 'participante'} ·{' '}
                      {formatDateTime(settlement.completedAt ?? settlement.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                  <p className="numeric text-sm font-medium text-gold-bright">
                    {formatBRL(settlement.amount)}
                  </p>
                  <SettlementStatusBadge status={settlement.status} />
                </div>

                <div className="flex items-center gap-2 border-t border-line/60 pt-3 sm:border-t-0 sm:pt-0">
                  {settlement.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1 text-[0.625rem] text-mist-dim">
                      <Clock aria-hidden="true" className="size-3" />
                      Processamento
                    </span>
                  )}
                  {settlement.status === 'COMPLETED' && (
                    <span className="inline-flex items-center gap-1 text-[0.625rem] text-win">
                      <Banknote aria-hidden="true" className="size-3" />
                      Creditado
                    </span>
                  )}
                  <Link
                    to={`/recibo/${settlement.publicToken}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[0.6875rem] font-medium text-mist transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    <Receipt aria-hidden="true" className="size-3" />
                    Recibo
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sold.some((settlement) => settlement.status === 'FAILED') && (
        <InlineAlert tone="warning" title="Liquidações com falha" className="mt-5">
          Falhas exigem atuação do administrador. O valor não é contabilizado no
          total recebido enquanto o status não for concluído pelo servidor.
        </InlineAlert>
      )}
    </div>
  );
}
