import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ArrowRight,
  Gavel,
  Landmark,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { batchsService } from "@/services/batchs.service";
import { queryKeys } from "@/services/query-keys";
import type { BatchListFilters } from "@/types/domain";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { presentError } from "@/utils/errors";
import { BatchSpotlight } from "@/components/batchs/BatchSpotlight";
import { BatchCard } from "@/components/batchs/BatchCard";
import {
  BatchFilters,
  type BatchFilterState,
} from "@/components/batchs/BatchFilters";
import { Pagination } from "@/components/batchs/Pagination";
import { BatchGridSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { SectionHeader } from "@/components/layout/PageHeader";
import { Button, buttonStyles } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Histórico encadeado",
    description:
      "Cada lance recebe sequência e hash próprios. A trilha pública permite conferir a ordem das ofertas.",
  },
  {
    icon: Landmark,
    title: "Carteira com reserva",
    description:
      "O saldo disponível é reservado a cada lance. O servidor é a autoridade sobre valores e limites.",
  },
  {
    icon: LockKeyhole,
    title: "Liquidação rastreável",
    description:
      "Arremates geram recibos com token público de consulta, sem expor dados pessoais dos participantes.",
  },
];

export function HomePage() {
  useDocumentTitle();
  const [filters, setFilters] = useState<BatchFilterState>({
    search: "",
    status: "",
    sort: "ending",
  });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const { isAuthenticated } = useAuth();

  const queryFilters = useMemo<BatchListFilters>(() => {
    const sortMap: Record<
      BatchFilterState["sort"],
      Pick<BatchListFilters, "sortBy" | "sortOrder">
    > = {
      ending: { sortBy: "endsAt", sortOrder: "asc" },
      startingPrice: { sortBy: "startingPrice", sortOrder: "asc" },
      newest: { sortBy: "createdAt", sortOrder: "desc" },
    };

    return {
      page,
      limit: 12,
      status: filters.status || undefined,
      search: debouncedSearch.trim() || undefined,
      ...sortMap[filters.sort],
    };
  }, [filters.status, filters.sort, debouncedSearch, page]);

  const lotsQuery = useQuery({
    queryKey: queryKeys.batchs.list(queryFilters),
    queryFn: () => batchsService.list(queryFilters),
    placeholderData: keepPreviousData,
  });

  const spotlightQuery = useQuery({
    queryKey: ["batchs", "spotlight", "active"],
    queryFn: () =>
      batchsService.list({
        status: "ACTIVE",
        limit: 6,
        sortBy: "endsAt",
        sortOrder: "asc",
      }),
    staleTime: 30_000,
  });

  const spotlight = useMemo(() => {
    const items = spotlightQuery.data?.data ?? [];
    return [...items].sort((a, b) => b.bidCount - a.bidCount)[0] ?? items[0];
  }, [spotlightQuery.data]);

  const error = lotsQuery.error ? presentError(lotsQuery.error) : null;
  const updateFilters = (next: BatchFilterState) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <section className="relative">
        <div className="max-w-3xl">
          <p className="eyebrow flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Curadoria Pokémon TCG · leilões encerrados com transparência
          </p>
          <h1 className="display mt-4 text-[clamp(2.6rem,7vw,5.2rem)] text-chalk">
            Cartas de coleção,
            <br />
            <em>disputa à altura.</em>
          </h1>
          <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-mist sm:text-base">
            Lotes selecionados a partir do catálogo Cardex, lances com reserva
            de saldo e um registro auditável de cada movimento. Entre, acompanhe
            o relógio e dê seu lance.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#vitrine" className={buttonStyles("primary", "lg")}>
              <Gavel aria-hidden="true" className="size-4" />
              Explorar lotes
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
            {!isAuthenticated && (
              <Link to="/cadastro" className={buttonStyles("secondary", "lg")}>
                Criar conta de licitante
              </Link>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-y border-line/60 py-4 text-xs text-mist-dim">
          <span className="inline-flex items-center gap-2">
            <Timer aria-hidden="true" className="size-3.5 text-gold" />
            Lotes com prazo e incremento definidos
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-3.5 text-win" />
            Registro de lances com hash
          </span>
          <span className="inline-flex items-center gap-2">
            <Landmark aria-hidden="true" className="size-3.5 text-info" />
            Recibo público de liquidação
          </span>
        </div>
      </section>

      <section aria-labelledby="destaque-title" className="mt-12">
        <h2 id="destaque-title" className="sr-only">
          Lote em destaque
        </h2>
        {spotlightQuery.isPending ? (
          <div className="grid gap-8 rounded-[1.5rem] border border-line bg-raised/40 p-6 lg:grid-cols-[0.85fr_1.15fr] lg:p-10">
            <Skeleton className="mx-auto aspect-[3/4] w-full max-w-[22rem] rounded-xl" />
            <div className="flex flex-col justify-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-4/5" />
              <Skeleton className="h-4 w-2/5" />
              <div className="grid grid-cols-2 gap-6 pt-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
              <Skeleton className="h-12 w-52 rounded-lg" />
            </div>
          </div>
        ) : spotlight ? (
          <BatchSpotlight batch={spotlight} />
        ) : (
          <EmptyState
            icon={Gavel}
            title="Nenhum lote ao vivo neste momento"
            description="A próxima sessão ainda não abriu. Enquanto isso, explore os lotes agendados e encerrados da vitrine."
          />
        )}
      </section>

      <section id="vitrine" className="mt-16 scroll-mt-24">
        <SectionHeader
          eyebrow="Vitrine"
          title="Lotes em circulação"
          description="Filtre por situação, busque pela carta e acompanhe o preço atual de cada lote."
          action={
            <p className="text-xs text-mist-dim">
              {lotsQuery.data ? (
                <>
                  <span className="numeric text-chalk">
                    {lotsQuery.data.meta.total}
                  </span>{" "}
                  {lotsQuery.data.meta.total === 1
                    ? "lote encontrado"
                    : "lotes encontrados"}
                </>
              ) : (
                "Consultando catálogo"
              )}
            </p>
          }
        />

        <BatchFilters
          value={filters}
          onChange={updateFilters}
          className="mt-5"
        />

        <div className="mt-6">
          {lotsQuery.isPending ? (
            <BatchGridSkeleton count={8} />
          ) : error ? (
            <ErrorState
              title={error.title}
              message={error.message}
              onRetry={() => void lotsQuery.refetch()}
            />
          ) : lotsQuery.data && lotsQuery.data.data.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lotsQuery.data.data.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="Nenhum lote para estes filtros"
              description="Tente outro termo de busca ou remova o filtro de situação para ver toda a vitrine."
              action={
                <Button
                  variant="secondary"
                  className="cursor-pointer"
                  size="sm"
                  onClick={() =>
                    updateFilters({ search: "", status: "", sort: "ending" })
                  }
                  leftIcon={
                    <RefreshCw aria-hidden="true" className="size-3.5" />
                  }
                >
                  Limpar filtros
                </Button>
              }
            />
          )}
        </div>

        {lotsQuery.data && (
          <Pagination meta={lotsQuery.data.meta} onPageChange={setPage} />
        )}
      </section>

      <section className="mt-20" aria-labelledby="confianca-title">
        <SectionHeader
          eyebrow="Como funciona"
          title="Confiança não é um selo. É um registro."
          description="A AureBid separa vitrine, carteira e liquidação como etapas distintas — cada uma com sua fonte de verdade."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {trustItems.map((item) => (
            <div key={item.title} className="surface p-5">
              <span className="flex size-9 items-center justify-center rounded-lg border border-gold/20 bg-gold/[0.07]">
                <item.icon aria-hidden="true" className="size-4 text-gold" />
              </span>
              <h3
                id={
                  item.title === trustItems[0].title
                    ? "confianca-title"
                    : undefined
                }
                className="mt-4 font-display text-lg text-chalk"
              >
                {item.title}
              </h3>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-mist">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
