import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Clock, Receipt, RefreshCw } from "lucide-react";
import type { Settlement, SettlementStatus } from "@/types/domain";
import { settlementsService } from "@/services/settlements.service";
import { queryKeys } from "@/services/query-keys";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettlementStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { CardImage } from "@/components/cards/CardImage";
import { formatBRL } from "@/utils/money";
import { formatDateTime } from "@/utils/datetime";
import { presentError } from "@/utils/errors";
import { cn } from "@/utils/cn";

const statusFilters: Array<{ value: SettlementStatus | ""; label: string }> = [
  { value: "", label: "Todas as situações" },
  { value: "PENDING", label: "Aguardando" },
  { value: "PROCESSING", label: "Em processamento" },
  { value: "COMPLETED", label: "Concluídas" },
  { value: "FAILED", label: "Falhas" },
];

function SettlementItem({
  settlement,
  userId,
  processing,
  onProcess,
}: {
  settlement: Settlement;
  userId: string | undefined;
  processing: boolean;
  onProcess: (settlement: Settlement) => void;
}) {
  const isBuyer = settlement.buyerId === userId;
  const canProcess = settlement.status === "PENDING" && isBuyer;

  return (
    <li className="surface-soft p-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link
          to={`/lotes/${settlement.batchId}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <CardImage
            src={settlement.batch?.imageUrl}
            alt={`Carta ${settlement.batch?.title ?? "arrematada"}`}
            className="h-20 w-16 shrink-0 rounded-lg"
          />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-mono text-[0.5625rem] tracking-[0.12em] text-gold/80 uppercase">
              {settlement.receiptNumber}
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[0.5rem] tracking-[0.1em]",
                  isBuyer
                    ? "border-info/30 text-info"
                    : "border-line text-mist-dim",
                )}
              >
                {isBuyer ? "Compra" : "Participação"}
              </span>
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-chalk">
              {settlement.batch?.title ?? "Lote"}
            </p>
            <p className="mt-1 text-[0.6875rem] text-mist-dim">
              {isBuyer ? "Vendedor" : "Contraparte"}:{" "}
              {isBuyer
                ? (settlement.seller?.name ?? "participante")
                : (settlement.buyer?.name ?? "participante")}{" "}
              · {formatDateTime(settlement.completedAt ?? settlement.createdAt)}
            </p>
          </div>
        </Link>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <p className="numeric text-sm font-medium text-gold-bright">
            {formatBRL(settlement.amount)}
          </p>
          <SettlementStatusBadge status={settlement.status} />
        </div>

        <div className="flex items-center gap-2 border-t border-line/60 pt-3 sm:border-t-0 sm:pt-0">
          {canProcess && (
            <Button
              variant="secondary"
              size="sm"
              className="cursor-pointer"
              loading={processing}
              onClick={() => onProcess(settlement)}
            >
              Processar
            </Button>
          )}
          {settlement.status === "PENDING" && !canProcess && (
            <span className="inline-flex items-center gap-1 text-[0.625rem] text-mist-dim">
              <Clock aria-hidden="true" className="size-3" />
              Aguardando
            </span>
          )}
          {settlement.publicToken && (
            <Link
              to={`/recibo/${settlement.publicToken}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[0.6875rem] font-medium text-mist transition-colors hover:border-gold/40 hover:text-gold"
            >
              <Receipt aria-hidden="true" className="size-3" />
              Recibo
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

export function MySettlementsPage() {
  useDocumentTitle("Meus arremates");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | "">("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.settlements.mine,
    queryFn: () => settlementsService.listMine(1, 100),
    staleTime: 15_000,
  });

  const settlements = useMemo(() => {
    const all = query.data?.data ?? [];
    return all.filter((settlement) => {
      if (statusFilter && settlement.status !== statusFilter) return false;
      return true;
    });
  }, [query.data, statusFilter, user?.id]);

  const process = async (settlement: Settlement) => {
    setProcessingId(settlement.id);
    try {
      await settlementsService.process(settlement.id);
      push({
        title: "Processamento solicitado",
        description:
          "O servidor iniciou a liquidação. O status será atualizado conforme a confirmação.",
        tone: "info",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settlements.mine }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.detail }),
      ]);
    } catch (error) {
      const presentation = presentError(error);
      push({
        title: presentation.title,
        description: presentation.message,
        tone: presentation.tone,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const error = query.error ? presentError(query.error) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Arremates"
        title={
          <>
            O que passou <em>pelo martelo.</em>
          </>
        }
        description="Compras e vendas liquidadas, com recibo público e status atualizado pelo servidor. Nenhum valor é confirmado apenas neste navegador."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              className="cursor-pointer"
              onClick={() => void query.refetch()}
              loading={query.isFetching}
              leftIcon={<RefreshCw aria-hidden="true" className="size-3.5" />}
            >
              Atualizar
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="scroll-thin flex gap-1 overflow-x-auto">
          {statusFilters.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[0.6875rem] transition-colors cursor-pointer",
                statusFilter === filter.value
                  ? "border-gold/40 bg-gold/[0.08] text-gold"
                  : "border-line text-mist-dim hover:text-mist",
              )}
              aria-pressed={statusFilter === filter.value}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {query.isPending ? (
          <TableSkeleton rows={4} />
        ) : error ? (
          <ErrorState
            title={error.title}
            message={error.message}
            onRetry={() => void query.refetch()}
          />
        ) : settlements.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={
              query.data?.data.length === 0
                ? "Nenhum arremate por aqui"
                : "Nenhum resultado neste filtro"
            }
            description={
              query.data?.data.length === 0
                ? "Quando você vencer um lote, o arremate e o recibo aparecerão nesta área."
                : "Troque os filtros de situação para consultar outros arremates."
            }
            action={
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-bright"
              >
                Explorar a vitrine
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {settlements.map((settlement) => (
              <SettlementItem
                key={settlement.id}
                settlement={settlement}
                userId={user?.id}
                processing={processingId === settlement.id}
                onProcess={(item) => void process(item)}
              />
            ))}
          </ul>
        )}
      </div>

      <InlineAlert tone="info" className="mt-6">
        Processar uma liquidação apenas solicita a operação ao backend. A
        conclusão, o crédito e o recibo são definidos pelo servidor — esta tela
        não simula confirmações financeiras.
      </InlineAlert>
    </div>
  );
}
