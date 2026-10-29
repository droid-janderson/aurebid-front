import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Gavel, Receipt, RefreshCw } from "lucide-react";
import type { Batch, Settlement } from "@/types/domain";
import { batchsService } from "@/services/batchs.service";
import { settlementsService } from "@/services/settlements.service";
import { queryKeys } from "@/services/query-keys";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useBatchCatalogRoom } from "@/realtime/useBatchCatalogRoom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Countdown } from "@/components/batchs/Countdown";
import { Button, buttonStyles } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { RecordRow } from "@/components/ui/RecordRow";
import { SearchField } from "@/components/ui/SearchField";
import { formatBRL } from "@/utils/money";
import { formatDateTime } from "@/utils/datetime";
import { presentError } from "@/utils/errors";
import { cardSummaryLine, primaryCardImage } from "@/utils/product";
import { publicBatchCode } from "@/utils/pseudonym";
import { matchesQuery } from "@/utils/search";

type TabValue = "leading" | "completed";

function LeadingRow({ batch }: { batch: Batch }) {
  return (
    <RecordRow
      href={`/lotes/${batch.id}`}
      imageSrc={primaryCardImage(batch)}
      imageAlt={`Carta ${batch.title}`}
      eyebrow={`${publicBatchCode(batch.id)} · Ao vivo`}
      title={batch.title}
      meta={
        <>
          <span>
            Seu lance:{" "}
            <span className="numeric text-gold-bright">
              {formatBRL(batch.currentPrice)}
            </span>
          </span>
          <Countdown target={batch.endsAt} variant="compact" />
        </>
      }
      aside={
        <>
          <Badge tone="win">Liderando</Badge>
          <Link
            to={`/lotes/${batch.id}`}
            className={buttonStyles("ghost", "sm")}
          >
            Ver lote
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </>
      }
    />
  );
}

function SettlementRow({
  settlement,
  userId,
}: {
  settlement: Settlement;
  userId: string | undefined;
}) {
  const isBuyer = settlement.buyerId === userId;
  const counterpart = isBuyer
    ? settlement.seller?.name
    : settlement.buyer?.name;

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
            {isBuyer ? "Vendedor" : "Contraparte"}:{" "}
            {counterpart ?? "participante"}
          </span>
          <span>
            {formatDateTime(settlement.completedAt ?? settlement.createdAt)}
          </span>
        </>
      }
      aside={
        <>
          <Badge tone="win">Concluído</Badge>
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
      }
    />
  );
}

export function MySettlementsPage() {
  useDocumentTitle("Meus arremates");
  const { user } = useAuth();
  const [tab, setTab] = useState<TabValue>("leading");
  const [search, setSearch] = useState("");

  const settlementsQuery = useQuery({
    queryKey: queryKeys.settlements.mine,
    queryFn: () => settlementsService.listMine(1, 100),
    staleTime: 15_000,
  });

  const leadingQuery = useQuery({
    queryKey: queryKeys.batchs.leading,
    queryFn: () => batchsService.listLeading(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const leading = useMemo(
    () => leadingQuery.data?.data ?? [],
    [leadingQuery.data],
  );
  const leadingIds = useMemo(() => leading.map((batch) => batch.id), [leading]);

  useBatchCatalogRoom(leadingIds);

  const settlements = useMemo(
    () =>
      (settlementsQuery.data?.data ?? []).filter(
        (settlement) => settlement.status === "COMPLETED",
      ),
    [settlementsQuery.data],
  );

  const failedCount = useMemo(
    () =>
      (settlementsQuery.data?.data ?? []).filter(
        (settlement) => settlement.status === "FAILED",
      ).length,
    [settlementsQuery.data],
  );

  const filteredLeading = useMemo(
    () =>
      leading.filter((batch) =>
        matchesQuery(search, [
          batch.title,
          publicBatchCode(batch.id),
          cardSummaryLine(batch),
          batch.productSource,
        ]),
      ),
    [leading, search],
  );

  const filteredSettlements = useMemo(
    () =>
      settlements.filter((settlement) =>
        matchesQuery(search, [
          settlement.batch?.title,
          settlement.receiptNumber,
          publicBatchCode(settlement.batchId),
          settlement.buyer?.name,
          settlement.seller?.name,
        ]),
      ),
    [settlements, search],
  );

  const refetchAll = () => {
    void settlementsQuery.refetch();
    void leadingQuery.refetch();
  };

  const activeQuery = tab === "leading" ? leadingQuery : settlementsQuery;
  const error = activeQuery.error ? presentError(activeQuery.error) : null;
  const isSearching = search.trim().length > 0;
  const visibleCount =
    tab === "leading" ? filteredLeading.length : filteredSettlements.length;
  const totalCount = tab === "leading" ? leading.length : settlements.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Arremates"
        title={
          <>
            O que passou <em>pelo martelo.</em>
          </>
        }
        description="Lotes em que você está vencendo agora e arremates já liquidados, com recibo público. A liderança é definida pelo servidor e desaparece assim que outro licitante supera seu lance."
        actions={
          <Button
            variant="secondary"
            size="sm"
            className="cursor-pointer"
            onClick={refetchAll}
            loading={
              settlementsQuery.isFetching || leadingQuery.isFetching
            }
            leftIcon={<RefreshCw aria-hidden="true" className="size-3.5" />}
          >
            Atualizar
          </Button>
        }
      />

      <div className="mt-8 flex flex-col gap-4">
        <FilterTabs
          ariaLabel="Filtrar meus arremates"
          value={tab}
          onChange={(value) => {
            setTab(value);
            setSearch("");
          }}
          items={[
            {
              value: "leading",
              label: "Na liderança",
              count: leading.length,
            },
            {
              value: "completed",
              label: "Arremates",
              count: settlements.length,
            },
          ]}
        />

        <SearchField
          value={search}
          onChange={setSearch}
          ariaLabel={
            tab === "leading"
              ? "Buscar nos lotes em que estou liderando"
              : "Buscar nos meus arremates"
          }
          placeholder={
            tab === "leading"
              ? "Buscar na liderança"
              : "Buscar nos arremates"
          }
        />
      </div>

      <div className="mt-5">
        {activeQuery.isPending ? (
          <TableSkeleton rows={4} />
        ) : error ? (
          <ErrorState
            title={error.title}
            message={error.message}
            onRetry={refetchAll}
          />
        ) : visibleCount === 0 ? (
          <EmptyState
            icon={isSearching ? Receipt : tab === "leading" ? Gavel : Receipt}
            title={
              isSearching
                ? "Nenhum resultado na busca"
                : tab === "leading"
                  ? "Você não está liderando nenhum lote"
                  : "Nenhum arremate concluído"
            }
            description={
              isSearching
                ? "Ajuste os termos da busca ou limpe o campo para ver todos os registros."
                : tab === "leading"
                  ? "Dê um lance para assumir a liderança. O lote aparece aqui enquanto seu lance for o maior."
                  : "Quando você vencer um lote e a liquidação for concluída pelo servidor, o arremate e o recibo aparecerão aqui."
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
              ) : (
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-bright"
                >
                  Explorar a vitrine
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              )
            }
          />
        ) : tab === "leading" ? (
          <>
            <ul className="space-y-2">
              {filteredLeading.map((batch) => (
                <LeadingRow key={batch.id} batch={batch} />
              ))}
            </ul>
            {isSearching && visibleCount < totalCount && (
              <p className="mt-3 text-[0.6875rem] text-mist-dim">
                {visibleCount} de {totalCount} lotes
              </p>
            )}
          </>
        ) : (
          <>
            <ul className="space-y-2">
              {filteredSettlements.map((settlement) => (
                <SettlementRow
                  key={settlement.id}
                  settlement={settlement}
                  userId={user?.id}
                />
              ))}
            </ul>
            {isSearching && visibleCount < totalCount && (
              <p className="mt-3 text-[0.6875rem] text-mist-dim">
                {visibleCount} de {totalCount} arremates
              </p>
            )}
          </>
        )}
      </div>

      {tab === "completed" && failedCount > 0 && (
        <InlineAlert tone="warning" className="mt-6">
          {failedCount === 1
            ? "Um arremate seu está em análise pelo administrador."
            : `${failedCount} arremates seus estão em análise pelo administrador.`}{" "}
          Nenhuma ação é necessária da sua parte.
        </InlineAlert>
      )}
    </div>
  );
}
