import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Image as ImageIcon,
  Package,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import type { CatalogCard, CreateBatchInput } from "@/types/domain";
import { catalogService } from "@/services/catalog.service";
import { batchsService } from "@/services/batchs.service";
import { queryKeys } from "@/services/query-keys";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardImage } from "@/components/cards/CardImage";
import { FieldWrapper, Input, Select, Textarea } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button, buttonStyles } from "@/components/ui/Button";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  fieldErrorFor,
  presentError,
  type ErrorPresentation,
} from "@/utils/errors";
import { parseBRLInput } from "@/utils/money";
import { toZonedInputValue, zonedInputToIso } from "@/utils/datetime";
import { cn } from "@/utils/cn";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const schema = z
  .object({
    title: z
      .string()
      .min(3, "O título precisa ter ao menos 3 caracteres.")
      .max(200, "Use no máximo 200 caracteres."),
    description: z.string().max(5000, "Use no máximo 5000 caracteres."),
    startingPrice: z.string().min(1, "Informe o lance inicial."),
    minimumIncrement: z.string().min(1, "Informe o incremento mínimo."),
    startsAt: z.string().min(1, "Informe a data de início."),
    endsAt: z.string().min(1, "Informe a data de encerramento."),
    status: z.enum(["DRAFT", "SCHEDULED"]),
    productSource: z.string().min(1, "Informe a origem do produto.").max(100),
    externalProductId: z
      .string()
      .min(1, "Informe o identificador do produto.")
      .max(200),
    imageUrl: z.string(),
  })
  .superRefine((values, ctx) => {
    const startingPrice = parseBRLInput(values.startingPrice);
    if (startingPrice === null || startingPrice <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["startingPrice"],
        message: "Informe um valor positivo, como 1.250,00.",
      });
    }

    const increment = parseBRLInput(values.minimumIncrement);
    if (increment === null || increment <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["minimumIncrement"],
        message: "Informe um incremento positivo.",
      });
    }

    const start = zonedInputToIso(values.startsAt);
    const end = zonedInputToIso(values.endsAt);
    if (!start) {
      ctx.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Data de início inválida.",
      });
    }
    if (!end) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Data de encerramento inválida.",
      });
    }
    if (start && end && new Date(end) <= new Date(start)) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "O encerramento precisa ser posterior ao início.",
      });
    }

    if (values.imageUrl.trim()) {
      try {
        new URL(values.imageUrl);
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["imageUrl"],
          message: "Informe uma URL de imagem válida.",
        });
      }
    }
  });

type BatchForm = z.infer<typeof schema>;

function snapshotFromCard(card: CatalogCard) {
  return {
    source: "CARDEX",
    externalId: card.id,
    setId: card.setId,
    setName: card.setName,
    number: card.number,
    rarity: card.rarity,
    supertype: card.supertype,
    subtypes: card.subtypes,
    types: card.types,
    imageSmall: card.imageSmall,
    imageLarge: card.imageLarge,
  };
}

export function NewBatchPage() {
  useDocumentTitle("Novo lote");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToast();

  const [mode, setMode] = useState<"catalog" | "manual">("catalog");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<CatalogCard | null>(null);
  const [formError, setFormError] = useState<ErrorPresentation | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);

  const defaults = useMemo(() => {
    const now = Date.now();
    return {
      startsAt: toZonedInputValue(new Date(now + HOUR)),
      endsAt: toZonedInputValue(new Date(now + 3 * DAY)),
    };
  }, []);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BatchForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      startingPrice: "",
      minimumIncrement: "",
      startsAt: defaults.startsAt,
      endsAt: defaults.endsAt,
      status: "DRAFT",
      productSource: "CARDEX",
      externalProductId: "",
      imageUrl: "",
    },
  });

  const catalogQuery = useQuery({
    queryKey: queryKeys.catalog.search(debouncedSearch, page),
    queryFn: () => catalogService.search(debouncedSearch, page, 8),
    enabled: mode === "catalog",
    staleTime: 60_000,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const selectCard = (card: CatalogCard) => {
    setSelectedCard(card);
    setValue("externalProductId", card.id, { shouldValidate: true });
    setValue("productSource", "CARDEX", { shouldValidate: true });
    setValue(
      "title",
      `${card.name}${card.setName ? ` · ${card.setName}` : ""}`,
      { shouldValidate: true },
    );
    setValue("imageUrl", card.imageLarge ?? card.imageSmall ?? "", {
      shouldValidate: true,
    });
    setFormError(null);
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const startingPrice = parseBRLInput(values.startingPrice);
    const minimumIncrement = parseBRLInput(values.minimumIncrement);
    const startsAt = zonedInputToIso(values.startsAt);
    const endsAt = zonedInputToIso(values.endsAt);

    if (
      startingPrice === null ||
      minimumIncrement === null ||
      !startsAt ||
      !endsAt
    ) {
      setFormError({
        title: "Revise os campos",
        message: "Verifique valores e datas antes de continuar.",
        tone: "warning",
      });
      return;
    }

    const payload: CreateBatchInput = {
      productSource: values.productSource,
      externalProductId: values.externalProductId,
      title: values.title,
      description: values.description.trim() || undefined,
      imageUrl: values.imageUrl.trim() || undefined,
      startingPrice,
      minimumIncrement,
      startsAt,
      endsAt,
      status: values.status,
      ...(selectedCard
        ? { productData: { card: snapshotFromCard(selectedCard) } }
        : {}),
    };

    try {
      const batch = await batchsService.create(payload);
      push({
        title: values.status === "DRAFT" ? "Rascunho salvo" : "Lote agendado",
        description:
          values.status === "DRAFT"
            ? "Revise os dados e publique quando estiver pronto."
            : "O lote foi registrado pelo servidor e aguarda o horário de abertura.",
        tone: "success",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.batchs.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.batchs.summary }),
      ]);
      navigate(`/painel/lotes/${batch.id}`);
    } catch (error) {
      const fields = [
        "title",
        "description",
        "startingPrice",
        "minimumIncrement",
        "startsAt",
        "endsAt",
        "productSource",
        "externalProductId",
        "imageUrl",
      ] as const;
      fields.forEach((field) => {
        const message = fieldErrorFor(error, field);
        if (message) setError(field, { message });
      });
      setFormError(presentError(error));
    }
  });

  const apiMissing = catalogQuery.isError;
  const selectedName = selectedCard?.name;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/painel"
        className="inline-flex items-center gap-2 text-xs font-medium text-mist transition-colors hover:text-chalk"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Voltar ao painel
      </Link>

      <PageHeader
        className="mt-5"
        eyebrow="Cadastro de lote"
        title={
          <>
            Da catalogação <em>ao martelo.</em>
          </>
        }
        description="Escolha a carta no catálogo Cardex ou preencha manualmente. Defina a janela de disputa e as regras de incremento."
      />

      {formError && (
        <InlineAlert
          tone={formError.tone}
          title={formError.title}
          className="mt-6"
        >
          {formError.message}
        </InlineAlert>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section aria-labelledby="catalogo-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Passo 01</p>
              <h2
                id="catalogo-title"
                className="mt-1.5 font-display text-2xl text-chalk"
              >
                Item do lote
              </h2>
            </div>
            <div className="flex rounded-lg border border-line bg-ink/50 p-0.5">
              <button
                type="button"
                onClick={() => setMode("catalog")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[0.6875rem] font-medium transition-colors",
                  mode === "catalog"
                    ? "bg-raised text-chalk"
                    : "text-mist-dim hover:text-mist",
                )}
                aria-pressed={mode === "catalog"}
              >
                Catálogo
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[0.6875rem] font-medium transition-colors",
                  mode === "manual"
                    ? "bg-raised text-chalk"
                    : "text-mist-dim hover:text-mist",
                )}
                aria-pressed={mode === "manual"}
              >
                Manual
              </button>
            </div>
          </div>

          {mode === "catalog" ? (
            <div className="mt-5">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist-dim"
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar carta por nome, coleção ou número"
                  aria-label="Buscar cartas no catálogo"
                  className="pl-9"
                />
              </div>

              {apiMissing ? (
                <div className="mt-4">
                  <InlineAlert
                    tone="warning"
                    title="Busca de cartas indisponível"
                  >
                    O backend ainda não expõe o proxy de catálogo (
                    <code className="font-mono text-[0.6875rem]">
                      GET /catalog/cards
                    </code>
                    ). Você pode cadastrar o item manualmente ao lado.
                  </InlineAlert>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => setMode("manual")}
                      leftIcon={
                        <Package aria-hidden="true" className="size-3.5" />
                      }
                    >
                      Preencher manualmente
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => void catalogQuery.refetch()}
                      leftIcon={
                        <RefreshCw aria-hidden="true" className="size-3.5" />
                      }
                    >
                      Tentar de novo
                    </Button>
                  </div>
                </div>
              ) : catalogQuery.isPending ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="surface-soft flex gap-3 p-2.5">
                      <Skeleton className="h-20 w-14 shrink-0 rounded-md" />
                      <div className="flex-1 space-y-2 py-1">
                        <Skeleton className="h-2.5 w-16" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-2.5 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : catalogQuery.data && catalogQuery.data.items.length > 0 ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {catalogQuery.data.items.map((card) => {
                      const selected = selectedCard?.id === card.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => selectCard(card)}
                          className={cn(
                            "group relative flex gap-3 cursor-pointer rounded-xl border p-2.5 text-left transition-colors",
                            selected
                              ? "border-gold/60 bg-gold/[0.07]"
                              : "border-line bg-raised/30 hover:border-line-strong",
                          )}
                          aria-pressed={selected}
                        >
                          <CardImage
                            src={card.imageSmall ?? card.imageLarge}
                            alt={`Carta ${card.name}`}
                            className="h-20 w-14 shrink-0 rounded-md"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-[0.5rem] tracking-[0.1em] text-gold/80 uppercase">
                              {card.setName ?? card.setId} · #{card.number}
                            </span>
                            <span className="mt-1 block truncate text-[0.8125rem] font-medium text-chalk">
                              {card.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[0.625rem] text-mist-dim">
                              {card.rarity ?? card.supertype ?? "Carta"}
                            </span>
                          </span>
                          {selected && (
                            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-gold text-ink">
                              <Check aria-hidden="true" className="size-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[0.6875rem] text-mist-dim">
                      {catalogQuery.data.total} cartas encontradas
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        disabled={page <= 1}
                        onClick={() =>
                          setPage((value) => Math.max(1, value - 1))
                        }
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        disabled={page >= catalogQuery.data.totalPages}
                        onClick={() => setPage((value) => value + 1)}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    icon={Search}
                    compact
                    title="Carta não encontrada"
                    description="Tente outro nome, coleção ou número. Se a carta não estiver no catálogo, cadastre manualmente."
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setMode("manual")}
                      >
                        Cadastrar manualmente
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="surface mt-5 space-y-4 p-4">
              <InlineAlert tone="info">
                O cadastro manual exige o identificador do produto. Se o item
                vier de outro catálogo, informe a origem correta.
              </InlineAlert>
              <FieldWrapper
                label="Origem do produto"
                htmlFor="batch-source"
                error={errors.productSource?.message}
                hint="Ex.: CARDEX, MANUAL ou o nome do fornecedor."
                required
              >
                <Input
                  id="batch-source"
                  invalid={Boolean(errors.productSource)}
                  {...register("productSource")}
                />
              </FieldWrapper>
              <FieldWrapper
                label="Identificador externo"
                htmlFor="batch-external-id"
                error={errors.externalProductId?.message}
                required
              >
                <Input
                  id="batch-external-id"
                  placeholder="Código do item no catálogo"
                  invalid={Boolean(errors.externalProductId)}
                  {...register("externalProductId")}
                />
              </FieldWrapper>
            </div>
          )}

          {selectedCard && mode === "catalog" && (
            <div className="surface-soft mt-4 flex items-center gap-3 p-3">
              <CardImage
                src={selectedCard.imageSmall ?? selectedCard.imageLarge}
                alt={`Carta ${selectedCard.name}`}
                className="h-16 w-12 shrink-0 rounded-md"
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[0.5625rem] tracking-[0.1em] text-gold/80 uppercase">
                  Item selecionado
                </p>
                <p className="truncate text-sm font-medium text-chalk">
                  {selectedName}
                </p>
                <p className="truncate text-[0.6875rem] text-mist-dim">
                  {selectedCard.setName} · #{selectedCard.number}
                </p>
              </div>
              <Sparkles
                aria-hidden="true"
                className="size-4 shrink-0 text-gold"
              />
            </div>
          )}

          {mode === "catalog" && !selectedCard && (
            <div className="mt-4 flex items-start gap-2 text-[0.6875rem] leading-relaxed text-mist-dim">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-gold"
              />
              Selecione uma carta para preencher automaticamente título, imagem
              e identificador. Os campos continuam editáveis.
            </div>
          )}
        </section>

        <section aria-labelledby="detalhes-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Passo 02</p>
              <h2
                id="detalhes-title"
                className="mt-1.5 font-display text-2xl text-chalk"
              >
                Regras do leilão
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.5625rem] tracking-[0.12em] text-mist-dim uppercase">
              <ImageIcon aria-hidden="true" className="size-3" />
              {selectedCard ? "Item do catálogo" : "Preenchimento livre"}
            </span>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="surface mt-5 space-y-4 p-5"
          >
            <FieldWrapper
              label="Título do lote"
              htmlFor="batch-title"
              error={errors.title?.message}
              required
            >
              <Input
                id="batch-title"
                placeholder="Ex.: Charizard · Base Set"
                invalid={Boolean(errors.title)}
                {...register("title")}
              />
            </FieldWrapper>

            <FieldWrapper
              label="Descrição"
              htmlFor="batch-description"
              error={errors.description?.message}
              hint="Descreva condição, idioma e detalhes visíveis. Não declare autenticação que não existe."
            >
              <Textarea
                id="batch-description"
                placeholder="Detalhes do item, conservação e observações"
                invalid={Boolean(errors.description)}
                {...register("description")}
              />
            </FieldWrapper>

            {mode === "catalog" && (
              <input type="hidden" {...register("productSource")} />
            )}
            {mode === "catalog" && (
              <input type="hidden" {...register("externalProductId")} />
            )}

            <FieldWrapper
              label="URL da imagem"
              htmlFor="batch-image"
              error={errors.imageUrl?.message}
              hint="Opcional. Use a imagem oficial do catálogo."
            >
              <Input
                id="batch-image"
                type="url"
                placeholder="https://..."
                invalid={Boolean(errors.imageUrl)}
                {...register("imageUrl")}
              />
            </FieldWrapper>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldWrapper
                label="Lance inicial (R$)"
                htmlFor="batch-starting-price"
                error={errors.startingPrice?.message}
                required
              >
                <Controller
                  control={control}
                  name="startingPrice"
                  render={({ field }) => (
                    <MoneyInput
                      id="batch-starting-price"
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      placeholder="4.500,00"
                      className="numeric"
                      invalid={Boolean(errors.startingPrice)}
                    />
                  )}
                />
              </FieldWrapper>
              <FieldWrapper
                label="Incremento mínimo (R$)"
                htmlFor="batch-increment"
                error={errors.minimumIncrement?.message}
                required
              >
                <Controller
                  control={control}
                  name="minimumIncrement"
                  render={({ field }) => (
                    <MoneyInput
                      id="batch-increment"
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      placeholder="250,00"
                      className="numeric"
                      invalid={Boolean(errors.minimumIncrement)}
                    />
                  )}
                />
              </FieldWrapper>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldWrapper
                label="Início dos lances"
                htmlFor="batch-starts"
                error={errors.startsAt?.message}
                hint="Horário de Brasília."
                required
              >
                <Input
                  id="batch-starts"
                  type="datetime-local"
                  className="numeric text-[0.8125rem]"
                  invalid={Boolean(errors.startsAt)}
                  {...register("startsAt")}
                />
              </FieldWrapper>
              <FieldWrapper
                label="Encerramento"
                htmlFor="batch-ends"
                error={errors.endsAt?.message}
                hint="Horário de Brasília."
                required
              >
                <Input
                  id="batch-ends"
                  type="datetime-local"
                  className="numeric text-[0.8125rem]"
                  invalid={Boolean(errors.endsAt)}
                  {...register("endsAt")}
                />
              </FieldWrapper>
            </div>

            <FieldWrapper
              label="Situação inicial"
              htmlFor="batch-status"
              hint="Rascunho não aparece na vitrine. Agendado entra na fila do servidor."
            >
              <Select id="batch-status" {...register("status")}>
                <option value="DRAFT">Rascunho</option>
                <option value="SCHEDULED">Agendado</option>
              </Select>
            </FieldWrapper>

            <div className="flex flex-col gap-2 border-t border-line/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xs text-xs leading-relaxed text-mist-dim">
                {watch("status") === "DRAFT"
                  ? "Fica privado até você publicá-lo no painel."
                  : "Será publicado e ativado na data de início definida."}
              </p>
              <div className="flex gap-1">
                <Link to="/painel" className={buttonStyles("ghost", "md")}>
                  Cancelar
                </Link>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="cursor-pointer"
                  disabled={isSubmitting}
                  size="md"
                  rightIcon={
                    <ArrowRight aria-hidden="true" className="size-4" />
                  }
                >
                  {watch("status") === "DRAFT"
                    ? "Salvar rascunho"
                    : "Agendar lote"}
                </Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
