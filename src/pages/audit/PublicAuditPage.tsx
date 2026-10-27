import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Hash,
  Link2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { batchsService } from '@/services/batchs.service';
import { auditService } from '@/services/audit.service';
import { queryKeys } from '@/services/query-keys';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { BatchStatusBadge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatBRL } from '@/utils/money';
import { formatDateTime } from '@/utils/datetime';
import { presentError } from '@/utils/errors';
import { pseudonymFor, publicBatchCode } from '@/utils/pseudonym';
import { cn } from '@/utils/cn';

const verificationCopy = {
  VERIFIED: {
    icon: CheckCircle2,
    title: 'Cadeia verificada pelo servidor',
    tone: 'border-win/30 bg-win/[0.05]',
    iconClass: 'text-win',
    description:
      'O servidor conferiu a sequência de hashes dos lances e confirmou a integridade da trilha.',
  },
  FAILED: {
    icon: ShieldAlert,
    title: 'Falha de integridade detectada',
    tone: 'border-loss/35 bg-loss/[0.06]',
    iconClass: 'text-loss',
    description:
      'A verificação do servidor encontrou uma quebra na cadeia. Não trate este histórico como íntegro.',
  },
  UNAVAILABLE: {
    icon: CircleHelp,
    title: 'Verificação pública indisponível',
    tone: 'border-gold/30 bg-gold/[0.05]',
    iconClass: 'text-gold',
    description:
      'O ambiente não expõe verificação de integridade pública. Os registros abaixo são os retornados pela API, sem atestado de integridade.',
  },
} as const;

export function PublicAuditPage() {
  const { batchId } = useParams<{ batchId: string }>();
  useDocumentTitle('Auditoria pública');
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const batchQuery = useQuery({
    queryKey: queryKeys.batchs.detail(batchId ?? ''),
    queryFn: () => batchsService.get(batchId!),
    enabled: Boolean(batchId),
  });

  const auditQuery = useQuery({
    queryKey: queryKeys.audit.entries(batchId ?? ''),
    queryFn: () => auditService.list(batchId!),
    enabled: Boolean(batchId),
  });

  const verifyQuery = useQuery({
    queryKey: queryKeys.audit.verify(batchId ?? ''),
    queryFn: () => auditService.verify(batchId!),
    enabled: Boolean(batchId),
    retry: false,
  });

  if (!batchId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <ErrorState title="Lote não informado" message="O endereço está incompleto." />
      </div>
    );
  }

  if (batchQuery.isPending) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-6 h-12 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <Skeleton className="mt-8 h-24 w-full rounded-xl" />
        <Skeleton className="mt-4 h-72 w-full rounded-xl" />
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
  const entries = auditQuery.data ?? [];
  const verification = verifyQuery.data;
  const copy = verification ? verificationCopy[verification.status] : null;
  const VerifyIcon = copy?.icon;
  const auditError = auditQuery.error ? presentError(auditQuery.error) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to={`/lotes/${batch.id}`}
        className="inline-flex items-center gap-2 text-xs font-medium text-mist transition-colors hover:text-chalk"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Voltar ao lote
      </Link>

      <PageHeader
        className="mt-5"
        eyebrow={`Auditoria pública · lote ${publicBatchCode(batch.id)}`}
        title={
          <>
            A trilha dos <em>lances.</em>
          </>
        }
        description="Sequência, horário e hashes registrados pelo servidor para cada lance deste lote. A verificação de integridade é uma responsabilidade do backend."
        actions={
          <>
            <BatchStatusBadge status={batch.status} />
            <Link
              to={`/lotes/${batch.id}`}
              className={buttonStyles('secondary', 'sm')}
            >
              Abrir lote
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={buttonStyles('ghost', 'sm')}
            >
              <Link2 aria-hidden="true" className="size-3.5" />
              {copied ? 'Link copiado' : 'Copiar link'}
            </button>
          </>
        }
      />

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="surface-soft p-4">
          <p className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
            Lote
          </p>
          <p className="mt-1.5 truncate text-sm font-medium text-chalk">{batch.title}</p>
          <p className="numeric mt-0.5 text-[0.6875rem] text-mist-dim">
            {batch.bidCount} {batch.bidCount === 1 ? 'lance' : 'lances'} ·{' '}
            {formatBRL(batch.currentPrice)}
          </p>
        </div>
        <div className="surface-soft p-4">
          <p className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
            Registros exibidos
          </p>
          <p className="numeric mt-1.5 text-sm text-chalk">{entries.length}</p>
          <p className="mt-0.5 text-[0.6875rem] text-mist-dim">
            entradas com hash disponível
          </p>
        </div>
        <div className="surface-soft p-4">
          <p className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
            Encerramento
          </p>
          <p className="numeric mt-1.5 text-sm text-chalk">
            {formatDateTime(batch.endsAt)}
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-mist-dim">
            horário oficial do servidor
          </p>
        </div>
      </section>

      <div className="mt-4">
        {verifyQuery.isPending ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : verification && copy && VerifyIcon ? (
          <div className={cn('rounded-xl border p-4', copy.tone)}>
            <div className="flex items-start gap-3">
              <VerifyIcon
                aria-hidden="true"
                className={cn('mt-0.5 size-4 shrink-0', copy.iconClass)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-chalk">{copy.title}</p>
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-mist">
                  {copy.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.625rem] text-mist-dim">
                  {verification.checkedAt && (
                    <span>Conferido {formatDateTime(verification.checkedAt)}</span>
                  )}
                  <span>{verification.entries} entradas verificadas</span>
                  {verification.brokenAtSequence !== undefined && (
                    <span className="text-loss">
                      quebra na sequência {verification.brokenAtSequence}
                    </span>
                  )}
                  {verification.reason && <span>{verification.reason}</span>}
                </div>
              </div>
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-mist-dim" />
            </div>
          </div>
        ) : null}
      </div>

      {verification?.status === 'UNAVAILABLE' && (
        <InlineAlert tone="warning" className="mt-4" title="Sem atestado de integridade">
          Esta página não declara que a cadeia é válida. Ela exibe fielmente os
          registros retornados pela API pública de lances. O backend atual expõe
          verificação de integridade apenas para administradores.
        </InlineAlert>
      )}

      <section className="mt-8" aria-labelledby="cadeia-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Cadeia encadeada</p>
            <h2 id="cadeia-title" className="mt-1.5 font-display text-2xl text-chalk">
              Registros do lote
            </h2>
          </div>
          <p className="font-mono text-[0.5625rem] tracking-[0.1em] text-mist-dim uppercase">
            ordem crescente de sequência
          </p>
        </div>

        <div className="mt-4">
          {auditQuery.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : auditError ? (
            <InlineAlert tone="error" title={auditError.title}>
              {auditError.message}
            </InlineAlert>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Hash}
              title="Nenhum registro auditável"
              description="Este lote ainda não recebeu lances ou a API não retornou carimbos de auditoria."
            />
          ) : (
            <ol className="overflow-hidden rounded-xl border border-line">
              {entries.map((entry, index) => {
                const linked =
                  index === 0
                    ? !entry.previousHash
                    : entry.previousHash === entries[index - 1].currentHash;
                return (
                  <li
                    key={entry.bidId}
                    className="border-b border-line/60 bg-raised/30 px-4 py-3 last:border-b-0"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/[0.06] font-mono text-[0.6875rem] text-gold">
                        {String(entry.sequence).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-[0.8125rem] font-medium text-chalk">
                            {pseudonymFor(entry.bidder.id ?? '')}
                          </p>
                          <span className="numeric text-[0.8125rem] text-gold-bright">
                            {formatBRL(entry.amount)}
                          </span>
                          <span className="text-[0.625rem] text-mist-dim">
                            {formatDateTime(entry.createdAt)}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[0.5rem] tracking-[0.08em] uppercase',
                              linked
                                ? 'border-win/25 text-win'
                                : 'border-loss/30 text-loss',
                            )}
                            title={
                              linked
                                ? 'O hash anterior coincide com o registro da sequência anterior'
                                : 'O elo exibido não coincide com o registro anterior'
                            }
                          >
                            <Link2 aria-hidden="true" className="size-2.5" />
                            {linked ? 'elo consistente' : 'elo divergente'}
                          </span>
                        </div>
                        <div className="mt-1.5 grid gap-1 font-mono text-[0.5625rem] text-mist-dim sm:grid-cols-2">
                          <p className="truncate" title={entry.previousHash ?? 'Origem da cadeia'}>
                            <span className="text-mist-dim/70">prev:</span>{' '}
                            {entry.previousHash ?? '— origem —'}
                          </p>
                          <p className="truncate" title={entry.currentHash}>
                            <span className="text-mist-dim/70">hash:</span>{' '}
                            {entry.currentHash}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <p className="mt-3 text-[0.625rem] leading-relaxed text-mist-dim">
          A consistência de elo exibida acima é apenas uma conferência visual
          entre os registros retornados. Ela não substitui a verificação
          criptográfica do servidor.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link to={`/lotes/${batch.id}`} className={buttonStyles('secondary', 'sm')}>
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Voltar ao lote
        </Link>
        <Button variant="ghost" size="sm" onClick={() => void auditQuery.refetch()}>
          Recarregar registros
        </Button>
        {verifyQuery.isError && (
          <Button variant="ghost" size="sm" onClick={() => void verifyQuery.refetch()}>
            Tentar verificação
          </Button>
        )}
      </div>
    </div>
  );
}
