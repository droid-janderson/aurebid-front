import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Receipt,
  RefreshCw,
} from "lucide-react";
import type { Settlement } from "@/types/domain";
import { settlementsService } from "@/services/settlements.service";
import { queryKeys } from "@/services/query-keys";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonStyles } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { RecordRow } from "@/components/ui/RecordRow";
import { SearchField } from "@/components/ui/SearchField";
import { formatBRL, fromCents, toCents } from "@/utils/money";
import { formatDateTime } from "@/utils/datetime";
import { presentError } from "@/utils/errors";
import { publicBatchCode } from "@/utils/pseudonym";
import { matchesQuery } from "@/utils/search";

type TabValue = "completed" | "failed";

function SettlementRow({ settlement }: { settlement: Settlement }) {
  const completed = settlement.status === "COMPLETED";

  return (
    <RecordRow
      href={`/lotes/${settlement.batchId}`}
      imageSrc={settlement.batch?.imageUrl ?? null}
      imageAlt={`Carta ${settlement.batch?.title ?? "arrematada"}`}
      eyebrow={`${settlement.receiptNumber} · ${publicBatchCode(settlement.batchId)}`}
      title={settlement.batch?.title ?? "Lote"}
      meta={
        <>
          <span className="numeric text-gold-bright">
            {formatBRL(settlement.amount)}
          </span>
          <span>
            Arrematado por {settlement.buyer?.name ?? "participante"}
          </span>
          <span>
            {formatDateTime(settlement.completedAt ?? settlement.createdAt)}
          </span>
          {!completed && settlement.failureReason && (
            <span className="text-loss">
              Motivo: {settlement.failureReason}
            </span>
          )}
        </>
      }
      aside={
        completed ? (
          <>
            <span className="inline-flex items-center gap-1 text-[0.625rem] text-win">
              <Banknote aria-hidden="true" className="size-3" />
              Creditado
            </span>
            {settlement.publicToken && (
              <Link
                to={`/recibo/${settlement.publicToken}`}
                className={buttonStyles("secondary", "sm")}
              >
                <Receipt aria-hidden="true" className="size-3.5" />
                Recibo
              </Link>
            )}
          </>
        ) : (
          <Badge tone="loss">Falha</Badge>
        )
      }
    />
  );
}

export function SellerResultsPage() {
  useDocumentTitle("Resultados do leiloeiro");
  const { user } = useAuth();
  const [tab, setTab] = useState<TabValue>("completed");
  const [search, setSearch] = useState("");

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

  const completed = useMemo(
    () => sold.filter((settlement) => settlement.status === "COMPLETED"),
    [sold],
  );

  const failed = useMemo(
    () => sold.filter((settlement) => settlement.status === "FAILED"),
    [sold],
  );

  const filtered = useMemo(() => {
    const items = tab === "completed" ? completed : failed;
    return items.filter((settlement) =>
      matchesQuery(search, [
        settlement.batch?.title,
        settlement.receiptNumber,
        publicBatchCode(settlement.batchId),
        settlement.buyer?.name,
      ]),
    );
  }, [tab, completed, failed, search]);

  const totals = useMemo(() => {
    const receivedCents = completed.reduce(
      (total, settlement) => total + toCents(settlement.amount),
      0,
    );

    return {
      received: fromCents(receivedCents),
      completed: completed.length,
      failed: failed.length,
    };
  }, [completed, failed]);

  const error = query.error ? presentError(query.error) : null;
  const isSearching = search.trim().length > 0;
  const totalCount = tab === "completed" ? completed.length : failed.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Resultados"
        title={
          <>
            Arremates <em>liquidados.</em>
          </>
        }
        description="Acompanhe cada lote vendido, o valor efetivamente creditado e o recibo público. A liquidação é concluída automaticamente pelo servidor."
        actions={
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
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
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
            Arremates
          </p>
          <p className="numeric mt-1.5 text-xl font-medium text-chalk">
            {totals.completed}
          </p>
          <p className="mt-0.5 text-[0.625rem] text-mist-dim">
            lotes com vencedor
          </p>
        </div>
        <div className="surface-soft p-4">
          <p className="text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
            Falhas
          </p>
          <p className="numeric mt-1.5 text-xl font-medium text-loss">
            {totals.failed}
          </p>
          <p className="mt-0.5 text-[0.625rem] text-mist-dim">
            liquidações com erro
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <FilterTabs
          ariaLabel="Filtrar resultados"
          value={tab}
          onChange={(value) => {
            setTab(value);
            setSearch("");
          }}
          items={[
            { value: "completed", label: "Concluídos", count: completed.length },
            { value: "failed", label: "Falhas", count: failed.length },
          ]}
        />

        <SearchField
          value={search}
          onChange={setSearch}
          ariaLabel={
            tab === "completed"
              ? "Buscar nos arremates concluídos"
              : "Buscar nas liquidações com falha"
          }
          placeholder={
            tab === "completed"
              ? "Buscar nos concluídos"
              : "Buscar nas falhas"
          }
        />
      </div>

      <div className="mt-5">
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
            icon={isSearching ? Receipt : tab === "failed" ? Receipt : BadgeCheck}
            title={
              isSearching
                ? "Nenhum resultado na busca"
                : tab === "completed"
                  ? "Nenhum arremate concluído"
                  : "Nenhuma falha registrada"
            }
            description={
              isSearching
                ? "Ajuste os termos da busca ou limpe o campo para ver todos os registros."
                : tab === "completed"
                  ? "Quando um dos seus lotes for encerrado com lance vencedor e a liquidação for concluída pelo servidor, o resultado aparecerá aqui."
                  : "Liquidações com erro aparecem aqui e ficam sob análise do administrador."
            }
            action={
              isSearching ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setSearch("")}
                >
                  Limpar busca
                </Button>
              ) : tab === "completed" && sold.length === 0 ? (
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
          <>
            <ul className="space-y-2">
              {filtered.map((settlement) => (
                <SettlementRow
                  key={settlement.id}
                  settlement={settlement}
                />
              ))}
            </ul>
            {isSearching && filtered.length < totalCount && (
              <p className="mt-3 text-[0.6875rem] text-mist-dim">
                {filtered.length} de {totalCount} registros
              </p>
            )}
          </>
        )}
      </div>

      {tab === "failed" && failed.length > 0 && (
        <InlineAlert tone="warning" className="mt-6">
          Falhas exigem atuação do administrador. O valor não é contabilizado no
          total recebido enquanto o status não for concluído pelo servidor.
        </InlineAlert>
      )}
    </div>
  );
}
