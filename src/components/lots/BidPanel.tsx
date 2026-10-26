import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Gavel,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type { Lot } from '@/types/domain';
import { useAuth } from '@/contexts/AuthContext';
import { bidsService } from '@/services/bids.service';
import { walletService } from '@/services/wallet.service';
import { queryKeys } from '@/services/query-keys';
import { useToast } from '@/components/ui/Toast';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import {
  formatAmountInput,
  formatBRL,
  minimumNextBid,
  parseBRLInput,
  toCents,
} from '@/utils/money';
import { formatDateTime } from '@/utils/datetime';
import { presentBidError, type ErrorPresentation } from '@/utils/errors';
import { SettlementStatusBadge } from '@/components/ui/Badge';

export function BidPanel({ lot }: { lot: Lot }) {
  const { user, isAuthenticated } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();

  const minimum = minimumNextBid(lot);
  const [draft, setDraft] = useState<string | null>(null);
  const [bidError, setBidError] = useState<ErrorPresentation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const value = draft ?? formatAmountInput(minimum);

  const walletQuery = useQuery({
    queryKey: queryKeys.wallet.detail,
    queryFn: () => walletService.get(),
    enabled: isAuthenticated,
    staleTime: 10_000,
  });

  const ended = lot.status === 'ENDED' || lot.status === 'SETTLED';
  const upcoming = lot.status === 'SCHEDULED';
  const cancelled = lot.status === 'CANCELLED';
  const isSeller = user?.id === lot.sellerId;
  const highestBid = lot.bids?.[0];
  const leading =
    Boolean(user) &&
    Boolean(highestBid) &&
    highestBid?.bidderId === user?.id;
  const loginTarget = `/login?from=${encodeURIComponent(
    `${location.pathname}${location.search}`,
  )}`;

  const amount = parseBRLInput(value) ?? 0;
  const belowMinimum = amount > 0 && toCents(amount) < toCents(minimum);
  const available = walletQuery.data?.availableAmount;
  const exceedsBalance =
    available !== undefined && amount > 0 && toCents(amount) > toCents(available);

  const placeBid = async () => {
    setBidError(null);

    if (!amount || amount <= 0) {
      setBidError({
        title: 'Informe um valor',
        message: 'Digite o valor do seu lance em reais.',
        tone: 'warning',
      });
      return;
    }

    if (belowMinimum) {
      setBidError({
        title: 'Abaixo do mínimo',
        message: `O próximo lance aceito parte de ${formatBRL(minimum)}.`,
        tone: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      const bid = await bidsService.place(lot.id, amount);
      push({
        title: 'Lance registrado',
        description: `${formatBRL(bid.amount)} confirmado pelo servidor.`,
        tone: 'success',
      });
      setDraft(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.lots.detail(lot.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bids.lot(lot.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bids.mine }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.detail }),
      ]);
    } catch (error) {
      const presentation = presentBidError(error, minimum);
      setBidError(presentation);
      push({
        title: presentation.title,
        description: presentation.message,
        tone: presentation.tone,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lots.detail(lot.id),
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
        <Link
          to="/"
          className={buttonStyles('secondary', 'md', 'mt-4 w-full')}
        >
          Ver outros lotes
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    );
  }

  if (ended) {
    const winner = highestBid;
    const settlement = lot.settlement;
    return (
      <div className="surface p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Resultado</p>
          {settlement && <SettlementStatusBadge status={settlement.status} />}
        </div>
        <p className="mt-3 text-sm text-mist">
          {winner ? 'Lance vencedor' : 'Encerrado sem lances'}
        </p>
        <p className="numeric mt-1 text-3xl font-medium text-gold-bright">
          {formatBRL(winner?.amount ?? lot.currentPrice)}
        </p>
        {winner && (
          <p className="mt-1 text-xs text-mist-dim">
            {winner.bidder.id === user?.id
              ? 'Você arrematou este lote.'
              : `Arrematado por ${winner.bidder.name}.`}
          </p>
        )}
        <p className="mt-4 border-t border-line/70 pt-3 text-xs text-mist-dim">
          Encerrado em {formatDateTime(lot.endsAt)}. A liquidação e o recibo são
          processados pelo servidor.
        </p>
        {settlement && (
          <Link
            to={`/recibo/${settlement.publicToken}`}
            className={buttonStyles('secondary', 'md', 'mt-4 w-full')}
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
            {leading ? 'Você está liderando' : 'Disputar lote'}
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
              {lot.bidCount > 0 ? 'Maior lance' : 'Lance inicial'}
            </p>
            <p className="numeric mt-1 text-3xl font-medium text-chalk">
              {formatBRL(lot.currentPrice)}
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
          Incremento mínimo de {formatBRL(lot.minimumIncrement)} ·{' '}
          {lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}
        </p>
      </div>

      <div className="p-5">
        {upcoming ? (
          <InlineAlert tone="info" title="Lances abrem em breve">
            Este lote começa em {formatDateTime(lot.startsAt)}. O relógio e os
            lances são controlados pelo servidor.
          </InlineAlert>
        ) : !isAuthenticated ? (
          <div>
            <p className="text-sm leading-relaxed text-mist">
              Entre na sua conta para reservar saldo e registrar um lance.
            </p>
            <Link to={loginTarget} className={buttonStyles('primary', 'md', 'mt-4 w-full')}>
              <LockKeyhole aria-hidden="true" className="size-4" />
              Entrar para dar lance
            </Link>
            <p className="mt-3 text-center text-[0.6875rem] text-mist-dim">
              Ainda não tem conta?{' '}
              <Link to="/cadastro" className="text-gold hover:text-gold-bright">
                Cadastre-se
              </Link>
            </p>
          </div>
        ) : isSeller ? (
          <InlineAlert tone="info" title="Este lote é seu">
            Você acompanha a disputa, mas a casa não aceita lance do próprio
            leiloeiro.
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

            {leading && (
              <InlineAlert tone="success" title="Seu lance é o maior" className="mb-4">
                Um novo lance seu precisa superar o próprio valor atual.
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
              <Input
                id="bid-amount"
                inputMode="decimal"
                value={value}
                onChange={(event) => {
                  setDraft(event.target.value);
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
                className="text-[0.6875rem] font-medium text-gold transition-colors hover:text-gold-bright"
              >
                Usar mínimo
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((step) => {
                const quick =
                  (toCents(minimum) + toCents(lot.minimumIncrement) * step) / 100;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      setDraft(formatAmountInput(quick));
                      setBidError(null);
                    }}
                    className="numeric rounded-lg border border-line bg-ink/50 py-2 text-[0.6875rem] text-mist transition-colors hover:border-gold/40 hover:text-chalk"
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
                  ? 'consultando…'
                  : available !== undefined
                    ? formatBRL(available)
                    : '—'}
              </span>
            </div>

            {exceedsBalance && (
              <p className="mt-2 flex items-start gap-1.5 text-[0.6875rem] leading-relaxed text-gold">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                O valor supera o saldo disponível agora. O servidor fará a
                validação definitiva.
              </p>
            )}

            <Button
              className="mt-4 w-full"
              size="lg"
              loading={submitting}
              onClick={() => void placeBid()}
              leftIcon={<Gavel aria-hidden="true" className="size-4" />}
              disabled={belowMinimum}
            >
              {leading ? 'Aumentar meu lance' : 'Confirmar lance'}
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
