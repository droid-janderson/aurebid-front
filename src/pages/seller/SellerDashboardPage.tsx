import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Gavel,
  Landmark,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import type { BatchListFilters, BatchStatus } from "@/types/domain";
import { batchsService } from "@/services/batchs.service";
import { queryKeys } from "@/services/query-keys";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { BatchStatusBadge } from "@/components/ui/Badge";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Pagination } from "@/components/batchs/Pagination";
import { formatBRL } from "@/utils/money";
import { formatDateTime } from "@/utils/datetime";
import { presentError } from "@/utils/errors";
import { cardSummaryLine, primaryCardImage } from "@/utils/product";
import { CardImage } from "@/components/cards/CardImage";
import { publicBatchCode } from "@/utils/pseudonym";
import { cn } from "@/utils/cn";

const statusTabs: Array<{ value: BatchStatus | ""; label: string }> = [
  { value: "", label: "Todos" },
  { value: "ACTIVE", label: "Ao vivo" },
  { value: "SCHEDULED", label: "Agendados" },
  { value: "DRAFT", label: "Rascunhos" },
  { value: "ENDED", label: "Encerrados" },
  { value: "SETTLED", label: "Liquidados" },
  { value: "CANCELLED", label: "Cancelados" },
];

export function SellerDashboardPage() {
  useDocumentTitle("Painel do leiloeiro");
  const [status, setStatus] = useState<BatchStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo<BatchListFilters>(
    () => ({
      page,
      limit: 12,
      status: status || undefined,
      search: search.trim() || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, status, search],
  );

  const lotsQuery = useQuery({
    queryKey: queryKeys.batchs.mine(filters),
    queryFn: () => batchsService.listMine(filters),
    placeholderData: keepPreviousData,
  });

  const error = lotsQuery.error ? presentError(lotsQuery.error) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Área do leiloeiro"
        title={
          <>
            Seus lotes, <em>sob controle.</em>
          </>
        }
        description="Publique cartas do catálogo, acompanhe a disputa e encerre leilões. O servidor valida prazos, lances e liquidação."
        actions={
          <Link
            to="/painel/lotes/novo"
            className={buttonStyles("primary", "md")}
          >
            <Plus aria-hidden="true" className="size-4" />
            Novo lote
          </Link>
        }
      />

      <section className="mt-10">
        <div className="flex flex-col gap-4">
          <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-line/70 pb-px">
            {statusTabs.map((tab) => (
              <button
                key={tab.value || "all"}
                type="button"
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2.5 text-[0.8125rem] font-medium transition-colors cursor-pointer",
                  status === tab.value
                    ? "border-gold text-gold"
                    : "border-transparent text-mist hover:text-chalk",
                )}
                aria-pressed={status === tab.value}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative max-w-lg">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist-dim"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar nos seus lotes"
              aria-label="Buscar nos seus lotes"
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-5">
          {lotsQuery.isPending ? (
            <TableSkeleton rows={6} />
          ) : error ? (
            <ErrorState
              title={error.title}
              message={error.message}
              onRetry={() => void lotsQuery.refetch()}
            />
          ) : lotsQuery.data && lotsQuery.data.data.length > 0 ? (
            <ul className="space-y-2">
              {lotsQuery.data.data.map((batch) => {
                const editable =
                  batch.status === "DRAFT" || batch.status === "SCHEDULED";
                const canManage =
                  editable || batch.status === "CANCELLED";
                return (
                  <li
                    key={batch.id}
                    className="surface-soft flex flex-col gap-4 p-3 transition-colors hover:border-line-strong sm:flex-row sm:items-center"
                  >
                    <Link
                      to={`/lotes/${batch.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <CardImage
                        src={primaryCardImage(batch)}
                        alt={`Carta ${batch.title}`}
                        className="h-20 w-16 shrink-0 rounded-lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[0.5625rem] tracking-[0.12em] text-gold/80 uppercase">
                          {cardSummaryLine(batch) || batch.productSource} ·{" "}
                          {publicBatchCode(batch.id)}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-medium text-chalk">
                          {batch.title}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-mist-dim">
                          <span>{formatBRL(batch.currentPrice)}</span>
                          <span>
                            {batch.bidCount}{" "}
                            {batch.bidCount === 1 ? "lance" : "lances"}
                          </span>
                          <span className="hidden sm:inline">
                            {editable ? "Início" : "Encerra"}{" "}
                            {formatDateTime(
                              editable ? batch.startsAt : batch.endsAt,
                            )}
                          </span>
                        </p>
                      </div>
                    </Link>

                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                      <BatchStatusBadge status={batch.status} />
                      {canManage && (
                        <Link
                          to={`/painel/lotes/${batch.id}`}
                          className={buttonStyles("secondary", "sm")}
                        >
                          <LayoutDashboard
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          Gerenciar
                        </Link>
                      )}
                      {!canManage && (
                        <Link
                          to={`/lotes/${batch.id}`}
                          className={buttonStyles("ghost", "sm")}
                        >
                          Ver lote
                          <ArrowRight aria-hidden="true" className="size-3.5" />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={status ? Search : Landmark}
              title={
                status || search
                  ? "Nenhum lote com estes critérios"
                  : "Sua casa ainda não tem lotes"
              }
              description={
                status || search
                  ? "Ajuste a busca ou selecione outra situação para encontrar seus lotes."
                  : "Cadastre a primeira carta, defina preço inicial e incremento e publique quando estiver pronto."
              }
              action={
                status || search ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => {
                      setStatus("");
                      setSearch("");
                      setPage(1);
                    }}
                    leftIcon={
                      <RefreshCw aria-hidden="true" className="size-3.5" />
                    }
                  >
                    Limpar filtros
                  </Button>
                ) : (
                  <Link
                    to="/painel/lotes/novo"
                    className={buttonStyles("primary", "sm")}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Criar primeiro lote
                  </Link>
                )
              }
            />
          )}
        </div>

        {lotsQuery.data && (
          <Pagination meta={lotsQuery.data.meta} onPageChange={setPage} />
        )}
      </section>

      <aside className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="surface p-5">
          <span className="flex size-9 items-center justify-center rounded-lg border border-gold/20 bg-gold/[0.07]">
            <Gavel aria-hidden="true" className="size-4 text-gold" />
          </span>
          <h2 className="mt-3 font-display text-lg text-chalk">
            Preparando um novo lote?
          </h2>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-mist">
            Busque a carta no catálogo ou preencha manualmente. Defina lance
            inicial, incremento e janela de disputa.
          </p>
          <Link
            to="/painel/lotes/novo"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-bright"
          >
            Cadastrar lote
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
        <div className="surface p-5">
          <span className="flex size-9 items-center justify-center rounded-lg border border-win/20 bg-win/[0.06]">
            <Landmark aria-hidden="true" className="size-4 text-win" />
          </span>
          <h2 className="mt-3 font-display text-lg text-chalk">
            Resultados e recibos
          </h2>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-mist">
            Consulte os arremates, o status da liquidação e o total efetivamente
            recebido nos leilões encerrados.
          </p>
          <Link
            to="/painel/resultados"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-bright"
          >
            Ver resultados
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
