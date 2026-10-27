import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Fingerprint,
  Printer,
  Receipt,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { settlementsService } from '@/services/settlements.service';
import { queryKeys } from '@/services/query-keys';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BrandMark } from '@/components/ui/Logo';
import { SettlementStatusBadge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { Skeleton } from '@/components/ui/Skeleton';
import { CardImage } from '@/components/cards/CardImage';
import { formatBRL } from '@/utils/money';
import { formatDateTime } from '@/utils/datetime';
import { presentError } from '@/utils/errors';
import { toApiError } from '@/services/api-error';
import { pseudonymFor, publicBatchCode } from '@/utils/pseudonym';

export function ReceiptPage() {
  const { token } = useParams<{ token: string }>();
  useDocumentTitle('Recibo de arremate');

  const query = useQuery({
    queryKey: queryKeys.settlements.byToken(token ?? ''),
    queryFn: () => settlementsService.getPublic(token!),
    enabled: Boolean(token),
    retry: false,
  });

  if (!token) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <ErrorState title="Recibo não informado" message="O endereço está incompleto." />
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="mt-6 h-[32rem] w-full rounded-2xl" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    const error = presentError(query.error);
    const notFound = toApiError(query.error).status === 404;
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <ErrorState
          title={notFound ? 'Recibo não encontrado' : error.title}
          message={
            notFound
              ? 'Não existe recibo público para este código. Confira o link informado.'
              : error.message
          }
          action={
            <Link to="/" className={buttonStyles('secondary', 'sm')}>
              Voltar para a vitrine
            </Link>
          }
        />
      </div>
    );
  }

  const settlement = query.data;
  const completed = settlement.status === 'COMPLETED';
  const failed = settlement.status === 'FAILED';
  const buyerLabel = pseudonymFor(settlement.buyer.id, 'Comprador');
  const sellerLabel = pseudonymFor(settlement.seller.id, 'Vendedor');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-mist transition-colors hover:text-chalk"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Vitrine
        </Link>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
          leftIcon={<Printer aria-hidden="true" className="size-3.5" />}
        >
          Imprimir
        </Button>
      </div>

      <article className="surface relative mt-5 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 hero-grid opacity-50"
          aria-hidden="true"
        />
        <div className="relative border-b border-line/70 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandMark className="size-10" />
              <div>
                <p className="font-display text-lg text-chalk">
                  Aure<span className="text-gold">Bid</span>
                </p>
                <p className="font-mono text-[0.5625rem] tracking-[0.2em] text-mist-dim uppercase">
                  Recibo de arremate
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[0.5625rem] tracking-[0.14em] text-mist-dim uppercase">
                Número
              </p>
              <p className="numeric mt-0.5 text-sm text-chalk">
                {settlement.receiptNumber}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Arremate</p>
              <h1 className="display mt-2 text-3xl text-chalk sm:text-4xl">
                {settlement.batch?.title ?? 'Lote'}
              </h1>
              <p className="mt-1 font-mono text-[0.625rem] tracking-[0.12em] text-mist-dim uppercase">
                Lote {publicBatchCode(settlement.batchId)} ·{' '}
                {settlement.batch?.status ?? 'status não informado'}
              </p>
            </div>
            <SettlementStatusBadge status={settlement.status} />
          </div>
        </div>

        <div className="relative grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
          <div>
            <div className="flex items-start gap-4">
              <CardImage
                src={settlement.batch?.imageUrl}
                alt={`Carta ${settlement.batch?.title ?? 'arrematada'}`}
                className="h-28 w-20 shrink-0 rounded-lg"
              />
              <div className="min-w-0">
                <p className="text-[0.625rem] tracking-[0.1em] text-mist-dim uppercase">
                  Valor do arremate
                </p>
                <p className="numeric mt-1 text-3xl font-medium text-gold-bright">
                  {formatBRL(settlement.amount)}
                </p>
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-mist-dim">
                  {completed
                    ? 'Liquidação concluída pelo servidor.'
                    : failed
                      ? 'A liquidação falhou. O valor não deve ser considerado recebido.'
                      : 'Liquidação em andamento. O recibo só é definitivo após a conclusão.'}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-line/70 pt-5 sm:grid-cols-2">
              <div>
                <dt className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
                  Comprador
                </dt>
                <dd className="mt-0.5 text-[0.8125rem] text-chalk">{buyerLabel}</dd>
              </div>
              <div>
                <dt className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
                  Vendedor
                </dt>
                <dd className="mt-0.5 text-[0.8125rem] text-chalk">{sellerLabel}</dd>
              </div>
              <div>
                <dt className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
                  Arremate criado
                </dt>
                <dd className="numeric mt-0.5 text-[0.8125rem] text-chalk">
                  {formatDateTime(settlement.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
                  Concluído em
                </dt>
                <dd className="numeric mt-0.5 text-[0.8125rem] text-chalk">
                  {formatDateTime(settlement.completedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
                  Encerramento do lote
                </dt>
                <dd className="numeric mt-0.5 text-[0.8125rem] text-chalk">
                  {formatDateTime(settlement.batch?.endsAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
                  Lance vencedor
                </dt>
                <dd className="numeric mt-0.5 text-[0.8125rem] text-chalk">
                  {settlement.winningBid
                    ? formatBRL(settlement.winningBid.amount)
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <aside className="flex flex-col gap-3 sm:w-52">
            <div className="rounded-xl border border-line bg-ink/40 p-3.5">
              <p className="flex items-center gap-1.5 font-mono text-[0.5625rem] tracking-[0.14em] text-mist-dim uppercase">
                <Fingerprint aria-hidden="true" className="size-3" />
                Consulta pública
              </p>
              <p className="mt-2 text-[0.6875rem] leading-relaxed text-mist">
                Este documento é emitido pelo servidor e consultado por token.
                Dados pessoais e identificadores internos não são exibidos.
              </p>
            </div>

            {completed ? (
              <div className="rounded-xl border border-win/25 bg-win/[0.05] p-3.5">
                <p className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-win">
                  <BadgeCheck aria-hidden="true" className="size-3.5" />
                  Liquidação concluída
                </p>
                <p className="mt-1.5 text-[0.625rem] leading-relaxed text-mist">
                  O status e o valor abaixo refletem a resposta oficial do
                  servidor no momento da consulta.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-3.5">
                <p className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-gold">
                  <CalendarClock aria-hidden="true" className="size-3.5" />
                  Documento em andamento
                </p>
                <p className="mt-1.5 text-[0.625rem] leading-relaxed text-mist">
                  Consulte novamente após o processamento. A AureBid não antecipa
                  a confirmação.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-line bg-ink/40 p-3.5">
              <p className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-mist">
                <ShieldCheck aria-hidden="true" className="size-3.5 text-gold" />
                Integridade
              </p>
              <p className="mt-1.5 text-[0.625rem] leading-relaxed text-mist-dim">
                O recibo referencia o lote e o lance vencedor no banco. A
                verificação de integridade dos lances está disponível na trilha
                pública do lote.
              </p>
              <Link
                to={`/lotes/${settlement.batchId}/auditoria`}
                className="mt-2 inline-flex items-center gap-1 text-[0.625rem] font-medium text-gold hover:text-gold-bright"
              >
                Abrir auditoria do lote
              </Link>
            </div>
          </aside>
        </div>

        <div className="relative border-t border-line/70 bg-ink/30 px-6 py-4 sm:px-8">
          <p className="flex items-start gap-2 text-[0.625rem] leading-relaxed text-mist-dim">
            <Receipt aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            Recibo gerado pela AureBid. Em caso de divergência, prevalece o
            registro do servidor. Este documento não substitui nota fiscal.
          </p>
        </div>
      </article>

      {failed && (
        <InlineAlert tone="error" title="Liquidação com falha" className="mt-4">
          <span className="flex items-start gap-1.5">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            O valor não foi transferido. A equipe administrativa precisa revisar
            esta liquidação no servidor.
          </span>
        </InlineAlert>
      )}
    </div>
  );
}
