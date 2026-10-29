import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Gavel,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { Batch } from "@/types/domain";
import { useAuth } from "@/contexts/AuthContext";
import { bidsService } from "@/services/bids.service";
import { walletService } from "@/services/wallet.service";
import { queryKeys } from "@/services/query-keys";
import { useToast } from "@/components/ui/Toast";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { Button, buttonStyles } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import {
  formatAmountInput,
  formatBRL,
  minimumNextBid,
  parseBRLInput,
  toCents,
} from "@/utils/money";
import { formatDateTime } from "@/utils/datetime";
import { presentBidError, type ErrorPresentation } from "@/utils/errors";
import { SettlementStatusBadge } from "@/components/ui/Badge";
import { Countdown } from "@/components/batchs/Countdown";
import { useCountdown } from "@/hooks/useCountdown";
import { toApiError } from "@/services/api-error";

export function BidPanel({ batch }: { batch: Batch }) {
  const { user, isAuthenticated } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();

  const minimum = minimumNextBid(batch);
  const [draft, setDraft] = useState<string | null>(null);
  const [bidError, setBidError] = useState<ErrorPresentation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [assumedLeading, setAssumedLeading] = useState<{
    batchId: string;
    viewerId: string;
    amount: number;
  } | null>(null);
  const value = draft ?? formatAmountInput(minimum);

  const walletQuery = useQuery({
    queryKey: queryKeys.wallet.detail,
    queryFn: () => walletService.get(),
    enabled: isAuthenticated,
    staleTime: 10_000,
  });

  const ended = batch.status === "ENDED" || batch.status === "SETTLED";
  const upcoming = batch.status === "SCHEDULED";
  const cancelled = batch.status === "CANCELLED";
  const remaining = useCountdown(batch.endsAt, batch.status === "ACTIVE");
  const closed = batch.status === "ACTIVE" && remaining.expired;
  const showUrgentCountdown =
    batch.status === "ACTIVE" &&
    !remaining.expired &&
    remaining.totalMs <= 10 * 60 * 1000;
  const isSeller = user?.id === batch.sellerId;
  const isAuctioneerAccount = user?.role === "AUCTIONEER";
  const highestBid = batch.bids?.[0];
  const leadingFromServer = Boolean(user) && Boolean(highestBid?.bidder?.isMine);
  const leadingLocally =
    Boolean(user) &&
    assumedLeading !== null &&
    assumedLeading.batchId === batch.id &&
    assumedLeading.viewerId === user?.id &&
    (highestBid === undefined ||
      toCents(assumedLeading.amount) >= toCents(highestBid.amount));
  const leading = leadingFromServer || leadingLocally;
  const loginTarget = `/login?from=${encodeURIComponent(
    `${location.pathname}${location.search}`,
  )}`;

  const amount = parseBRLInput(value) ?? 0;
  const belowMinimum = amount > 0 && toCents(amount) < toCents(minimum);
  const available = walletQuery.data?.availableAmount;
  const exceedsBalance =
    available !== undefined &&
    amount > 0 &&
    toCents(amount) > toCents(available);

  const placeBid = async () => {
    setBidError(null);

    if (!amount || amount <= 0) {
      setBidError({
        title: "Informe um valor",
        message: "Digite o valor do seu lance em reais.",
        tone: "warning",
      });
      return;
    }

    if (belowMinimum) {
      setBidError({
        title: "Abaixo do mínimo",
        message: `O próximo lance aceito parte de ${formatBRL(minimum)}.`,
        tone: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const receipt = await bidsService.place(batch.id, amount);
      setAssumedLeading({
        batchId: batch.id,
        viewerId: user?.id ?? "anon",
        amount: receipt.amount,
      });
      push({
        title: "Lance registrado",
        description: `${formatBRL(receipt.amount)} confirmado pelo servidor.`,
        tone: "success",
      });
      setDraft(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.batchs.details(batch.id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.bids.forBatch(batch.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bids.mine }),
        queryClient.invalidateQueries({ queryKey: queryKeys.batchs.leading }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.detail }),
      ]);
    } catch (error) {
      const presentation = presentBidError(error, minimum);
      if (toApiError(error).code === "ALREADY_LEADING" && user) {
        setAssumedLeading({
          batchId: batch.id,
          viewerId: user.id,
          amount: batch.currentPrice,
        });
      }
      setBidError(presentation);
      push({
        title: presentation.title,
        description: presentation.message,
        tone: presentation.tone,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.batchs.details(batch.id),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (cancelled) {
    return (
      <div className="surface p-5">
        <InlineAlert tone="error" title="Lote cancelado">
          Este lote foi retirado da casa. Nenhum lance é aceito.
        </InlineAlert>
        <Link to="/" className={buttonStyles("secondary", "md", "mt-4 w-full")}>
          Ver outros lotes
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    );
  }

  if (ended) {
    const winner = highestBid;
    const settlement = batch.settlement;
    return (
      <div className="surface p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Resultado</p>
          {settlement && <SettlementStatusBadge status={settlement.status} />}
        </div>
        <p className="mt-3 text-sm text-mist">
          {winner ? "Lance vencedor" : "Encerrado sem lances"}
        </p>
        <p className="numeric mt-1 text-3xl font-medium text-gold-bright">
          {formatBRL(winner?.amount ?? batch.currentPrice)}
        </p>
        {winner && (
          <p className="mt-1 text-xs text-mist-dim">
            {winner.bidder?.isMine
              ? "Você arrematou este lote."
              : `Arrematado por ${winner.bidder?.label ?? "licitante"}.`}
          </p>
        )}
        <p className="mt-4 border-t border-line/70 pt-3 text-xs text-mist-dim">
          Encerrado em {formatDateTime(batch.endsAt)}. A liquidação e o recibo
          são processados pelo servidor.
        </p>
        {settlement?.publicToken && (
          <Link
            to={`/recibo/${settlement.publicToken}`}
            className={buttonStyles("secondary", "md", "mt-4 w-full")}
          >
            Abrir recibo público
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-line/70 bg-[linear-gradient(160deg,rgba(215,179,106,0.09),transparent_60%)] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">
            {leading ? "Você está liderando" : "Disputar lote"}
          </p>
          {leading && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] tracking-[0.12em] text-win uppercase">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Protegido
            </span>
          )}
        </div>

        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.6875rem] tracking-[0.1em] text-mist-dim uppercase">
              {batch.bidCount > 0 ? "Maior lance" : "Lance inicial"}
            </p>
            <p className="numeric mt-1 text-3xl font-medium text-chalk">
              {formatBRL(batch.currentPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.6875rem] tracking-[0.1em] text-mist-dim uppercase">
              Próximo mínimo
            </p>
            <p className="numeric mt-1 text-lg text-gold-bright">
              {formatBRL(minimum)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[0.6875rem] text-mist-dim">
          Incremento mínimo de {formatBRL(batch.minimumIncrement)} ·{" "}
          {batch.bidCount} {batch.bidCount === 1 ? "lance" : "lances"}
        </p>
      </div>

      <div className="p-5">
        {showUrgentCountdown && (
          <div
            className="mb-4 rounded-xl border border-gold/35 bg-gold/[0.06] p-4"
            role="status"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow text-gold">Fechamento iminente</p>
              <span className="font-mono text-[0.625rem] tracking-[0.12em] text-mist-dim uppercase">
                Últimos 10 minutos
              </span>
            </div>
            <Countdown target={batch.endsAt} variant="large" className="mt-3" />
            <p className="mt-3 text-[0.6875rem] leading-relaxed text-mist-dim">
              Lances nos últimos 2 minutos estendem o fechamento do lote em mais
              2 minutos.
            </p>
          </div>
        )}

        {closed ? (
          <InlineAlert tone="info" title="Lances encerrados">
            O prazo do lote terminou pelo relógio do servidor. Aguardando a
            apuração e o processamento da liquidação.
          </InlineAlert>
        ) : upcoming ? (
          <InlineAlert tone="info" title="Lances abrem em breve">
            Este lote começa em {formatDateTime(batch.startsAt)}. O relógio e os
            lances são controlados pelo servidor.
          </InlineAlert>
        ) : !isAuthenticated ? (
          <div>
            <p className="text-sm leading-relaxed text-mist">
              Entre na sua conta para reservar saldo e registrar um lance.
            </p>
            <Link
              to={loginTarget}
              className={buttonStyles("primary", "md", "mt-4 w-full")}
            >
              <LockKeyhole aria-hidden="true" className="size-4" />
              Entrar para dar lance
            </Link>
            <p className="mt-3 text-center text-[0.6875rem] text-mist-dim">
              Ainda não tem conta?{" "}
              <Link to="/cadastro" className="text-gold hover:text-gold-bright">
                Cadastre-se
              </Link>
            </p>
          </div>
        ) : isAuctioneerAccount ? (
          <InlineAlert tone="info" title="Conta de leiloeiro">
            Contas de leiloeiro não participam de lances.
          </InlineAlert>
        ) : isSeller ? (
          <InlineAlert tone="info" title="Este lote é seu">
            Você acompanha a disputa, mas a casa não aceita lance do próprio
            leiloeiro.
          </InlineAlert>
        ) : leading ? (
          <InlineAlert tone="success" title="Você está liderando">
            Você já tem o maior lance neste lote e não pode dar outro.
          </InlineAlert>
        ) : (
          <div>
            {bidError && (
              <InlineAlert
                tone={bidError.tone}
                title={bidError.title}
                className="mb-4"
              >
                {bidError.message}
              </InlineAlert>
            )}

            <label
              htmlFor="bid-amount"
              className="text-[0.8125rem] font-medium text-chalk"
            >
              Seu lance
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm text-mist-dim">
                R$
              </span>
              <MoneyInput
                id="bid-amount"
                value={value}
                onValueChange={(next) => {
                  setDraft(next);
                  setBidError(null);
                }}
                onBlur={() => {
                  if (!value.trim()) {
                    setDraft(null);
                  }
                }}
                className="numeric h-12 pl-10 text-base"
                invalid={belowMinimum}
                aria-describedby="bid-hint bid-balance"
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p id="bid-hint" className="text-[0.6875rem] text-mist-dim">
                Use vírgula para centavos. Mínimo {formatBRL(minimum)}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setBidError(null);
                }}
                className="text-[0.6875rem] font-medium text-gold transition-colors cursor-pointer hover:text-gold-bright"
              >
                Usar mínimo
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((step) => {
                const quick =
                  (toCents(minimum) + toCents(batch.minimumIncrement) * step) /
                  100;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      setDraft(formatAmountInput(quick));
                      setBidError(null);
                    }}
                    className="numeric rounded-lg border border-line cursor-pointer bg-ink/50 py-2 text-[0.6875rem] text-mist transition-colors hover:border-gold/40 hover:text-chalk"
                  >
                    {formatBRL(quick)}
                  </button>
                );
              })}
            </div>

            <div
              id="bid-balance"
              className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-line/70 bg-ink/40 px-3 py-2"
            >
              <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-mist-dim">
                <Wallet aria-hidden="true" className="size-3.5" />
                Disponível em carteira
              </span>
              <span className="numeric text-xs text-mist">
                {walletQuery.isPending
                  ? "consultando…"
                  : available !== undefined
                    ? formatBRL(available)
                    : "—"}
              </span>
            </div>

            {exceedsBalance && (
              <p className="mt-2 flex items-start gap-1.5 text-[0.6875rem] leading-relaxed text-gold">
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 size-3 shrink-0"
                />
                O valor supera o saldo disponível agora. O servidor fará a
                validação definitiva.
              </p>
            )}

            <Button
              className="mt-4 w-full cursor-pointer"
              size="lg"
              loading={submitting}
              onClick={() => void placeBid()}
              leftIcon={<Gavel aria-hidden="true" className="size-4" />}
              disabled={belowMinimum}
            >
              Confirmar lance{" "}
            </Button>

            <p className="mt-3 flex items-start gap-1.5 text-[0.625rem] leading-relaxed text-mist-dim">
              <Landmark aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
              O valor confirmado é reservado no seu saldo. As regras de
              incremento e disponibilidade são validadas pelo servidor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
