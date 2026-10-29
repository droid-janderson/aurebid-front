import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Landmark,
  LockKeyhole,
  Plus,
  Receipt,
  RefreshCw,
  Wallet as WalletIcon,
} from "lucide-react";
import type { WalletReservation, WalletTransaction } from "@/types/domain";
import { walletService } from "@/services/wallet.service";
import { queryKeys } from "@/services/query-keys";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useWalletRealtime } from "@/realtime/useWalletRealtime";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Dialog";
import { FieldWrapper } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatBRL, parseBRLInput } from "@/utils/money";
import { formatDateTime } from "@/utils/datetime";
import { presentError } from "@/utils/errors";
import { transactionTypeLabel } from "@/utils/labels";
import { cn } from "@/utils/cn";

const typeIcons = {
  DEPOSIT: ArrowDownLeft,
  BUYER_SETTLEMENT_DEBIT: ArrowUpRight,
  SELLER_SETTLEMENT_CREDIT: ArrowDownLeft,
  REFUND: ArrowDownLeft,
  ADJUSTMENT: Landmark,
} as const;

function ReservationRow({ reservation }: { reservation: WalletReservation }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-gold/[0.07]">
        <LockKeyhole aria-hidden="true" className="size-3.5 text-gold" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-medium text-chalk">
          {reservation.batch ? (
            <Link
              to={`/lotes/${reservation.batch.id}`}
              className="transition-colors hover:text-gold"
            >
              {reservation.batch.title}
            </Link>
          ) : (
            "Reserva de lance"
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[0.625rem] text-mist-dim">
          <Clock aria-hidden="true" className="size-3" />
          {reservation.batch
            ? `Encerra ${formatDateTime(reservation.batch.endsAt)}`
            : "Vinculada a um lance"}
        </p>
      </div>
      <span className="numeric shrink-0 text-[0.8125rem] text-gold-bright">
        {formatBRL(reservation.amount)}
      </span>
    </li>
  );
}

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const Icon = typeIcons[transaction.type];
  const positive =
    transaction.type === "DEPOSIT" ||
    transaction.type === "SELLER_SETTLEMENT_CREDIT" ||
    transaction.type === "REFUND";
  const amount = Math.abs(transaction.amount);

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border",
          positive
            ? "border-win/25 bg-win/[0.06] text-win"
            : "border-line-strong bg-ink/40 text-mist",
        )}
      >
        <Icon aria-hidden="true" className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-medium text-chalk">
          {transactionTypeLabel[transaction.type]}
        </p>
        <p className="mt-0.5 truncate text-[0.625rem] text-mist-dim">
          {formatDateTime(transaction.createdAt)}
          {transaction.description ? ` · ${transaction.description}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "numeric shrink-0 text-[0.8125rem]",
          positive ? "text-win" : "text-chalk",
        )}
      >
        {positive ? "+" : "−"} {formatBRL(amount)}
      </span>
    </li>
  );
}

export function WalletPage() {
  useDocumentTitle("Carteira");
  useWalletRealtime(true);
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [page, setPage] = useState(1);
  const [depositOpen, setDepositOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositing, setDepositing] = useState(false);

  const walletQuery = useQuery({
    queryKey: queryKeys.wallet.detail,
    queryFn: () => walletService.get(),
    staleTime: 10_000,
  });

  const transactionsQuery = useQuery({
    queryKey: queryKeys.wallet.transactions(page),
    queryFn: () => walletService.listTransactions(page, 10),
    staleTime: 10_000,
  });

  const wallet = walletQuery.data;
  const error = walletQuery.error ? presentError(walletQuery.error) : null;

  const activeReservations = useMemo(
    () => wallet?.reservations.filter((item) => item.status === "ACTIVE") ?? [],
    [wallet],
  );

  const submitDeposit = async () => {
    setDepositError(null);
    const parsed = parseBRLInput(amount);
    if (!parsed || parsed <= 0) {
      setDepositError("Informe um valor de depósito positivo.");
      return;
    }

    setDepositing(true);
    try {
      const result = await walletService.deposit({
        amount: parsed,
        method: "PIX",
      });
      push({
        title: "Depósito registrado",
        description: `${formatBRL(result.transaction.amount)} confirmado pelo servidor.`,
        tone: "success",
      });
      setDepositOpen(false);
      setAmount("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.detail }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.wallet.transactions(page),
        }),
      ]);
    } catch (submitError) {
      const presentation = presentError(submitError);
      setDepositError(`${presentation.title}. ${presentation.message}`);
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Carteira"
        title={
          <>
            Saldo pronto <em>para disputar.</em>
          </>
        }
        description="Depósitos, reservas de lances e movimentos de liquidação em um só lugar. Os valores exibidos vêm do servidor."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                void walletQuery.refetch();
                void transactionsQuery.refetch();
              }}
              loading={walletQuery.isFetching || transactionsQuery.isFetching}
              leftIcon={<RefreshCw aria-hidden="true" className="size-3.5" />}
            >
              Atualizar
            </Button>
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => setDepositOpen(true)}
              leftIcon={<Plus aria-hidden="true" className="size-3.5" />}
            >
              Depositar
            </Button>
          </>
        }
      />

      <InlineAlert tone="info" className="mt-5">
        Saldo de teste: este valor é simulado e não movimenta dinheiro real. A
        operação é executada pelo backend.
      </InlineAlert>

      {walletQuery.isPending ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="surface h-32 p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          className="mt-6"
          title={error.title}
          message={error.message}
          onRetry={() => void walletQuery.refetch()}
        />
      ) : wallet ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="surface relative overflow-hidden p-5">
              <div
                className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-gold/[0.07] blur-2xl"
                aria-hidden="true"
              />
              <p className="flex items-center gap-1.5 text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
                <WalletIcon aria-hidden="true" className="size-3" />
                Saldo total
              </p>
              <p className="numeric mt-2 text-3xl font-medium text-chalk">
                {formatBRL(wallet.balance)}
              </p>
              <p className="mt-1 text-[0.6875rem] text-mist-dim">
                Inclui valores reservados
              </p>
            </div>

            <div className="surface p-5">
              <p className="flex items-center gap-1.5 text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
                <LockKeyhole aria-hidden="true" className="size-3" />
                Reservado em lances
              </p>
              <p className="numeric mt-2 text-3xl font-medium text-gold-bright">
                {formatBRL(wallet.reservedAmount)}
              </p>
              <p className="mt-1 text-[0.6875rem] text-mist-dim">
                {activeReservations.length}{" "}
                {activeReservations.length === 1
                  ? "reserva ativa"
                  : "reservas ativas"}
              </p>
            </div>

            <div className="surface border-win/20 bg-win/[0.035] p-5">
              <p className="flex items-center gap-1.5 text-[0.625rem] tracking-[0.08em] text-mist-dim uppercase">
                <Landmark aria-hidden="true" className="size-3" />
                Disponível para novos lances
              </p>
              <p className="numeric mt-2 text-3xl font-medium text-win">
                {formatBRL(wallet.availableAmount)}
              </p>
              <p className="mt-1 text-[0.6875rem] text-mist-dim">
                Calculado pelo servidor
              </p>
            </div>
          </div>

          {wallet.availableAmount < 0 && (
            <InlineAlert
              tone="warning"
              title="Saldo disponível negativo"
              className="mt-4"
            >
              As reservas ativas superam o saldo atual. Regularize a carteira
              antes de disputar novos lotes.
            </InlineAlert>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section aria-labelledby="reservas-title">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="eyebrow">Comprometido</p>
                  <h2
                    id="reservas-title"
                    className="mt-1.5 font-display text-xl text-chalk"
                  >
                    Reservas ativas
                  </h2>
                </div>
                <p className="text-[0.6875rem] text-mist-dim">
                  {formatBRL(wallet.reservedAmount)}
                </p>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-line">
                {activeReservations.length === 0 ? (
                  <div className="bg-raised/30">
                    <EmptyState
                      icon={LockKeyhole}
                      compact
                      title="Nenhuma reserva ativa"
                      description="Ao dar um lance, o valor correspondente é reservado na sua carteira."
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-line/60 bg-raised/30">
                    {activeReservations.map((reservation) => (
                      <ReservationRow
                        key={reservation.id}
                        reservation={reservation}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section aria-labelledby="extrato-title">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="eyebrow">Movimentações</p>
                  <h2
                    id="extrato-title"
                    className="mt-1.5 font-display text-xl text-chalk"
                  >
                    Extrato da carteira
                  </h2>
                </div>
                <Link
                  to="/arremates"
                  className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium text-gold hover:text-gold-bright"
                >
                  <Receipt aria-hidden="true" className="size-3" />
                  Arremates
                </Link>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-line">
                {transactionsQuery.isPending ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : transactionsQuery.isError ? (
                  <InlineAlert tone="error" className="m-3">
                    {presentError(transactionsQuery.error).message}
                  </InlineAlert>
                ) : transactionsQuery.data.data.length === 0 ? (
                  <div className="bg-raised/30">
                    <EmptyState
                      icon={Receipt}
                      compact
                      title="Sem movimentações"
                      description="Depósitos e liquidações aparecerão aqui conforme o servidor registrar."
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-line/60 bg-raised/30">
                    {transactionsQuery.data.data.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                      />
                    ))}
                  </ul>
                )}
              </div>

              {transactionsQuery.data &&
                transactionsQuery.data.meta.totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[0.6875rem] text-mist-dim">
                      Página {transactionsQuery.data.meta.page} de{" "}
                      {transactionsQuery.data.meta.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        disabled={!transactionsQuery.data.meta.hasPrev}
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
                        disabled={!transactionsQuery.data.meta.hasNext}
                        onClick={() => setPage((value) => value + 1)}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
            </section>
          </div>
        </>
      ) : null}

      <Modal
        open={depositOpen}
        onOpenChange={(open) => {
          setDepositOpen(open);
          if (!open) setDepositError(null);
        }}
        title="Adicionar saldo"
        description="O valor será processado pelo servidor. Depósitos simulados não movimentam dinheiro real."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer"
              onClick={() => setDepositOpen(false)}
              disabled={depositing}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="cursor-pointer"
              loading={depositing}
              onClick={() => void submitDeposit()}
            >
              Confirmar depósito
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {depositError && (
            <InlineAlert tone="error" title="Depósito não realizado">
              {depositError}
            </InlineAlert>
          )}
          <FieldWrapper label="Valor (R$)" htmlFor="deposit-amount" required>
            <MoneyInput
              id="deposit-amount"
              value={amount}
              onValueChange={(next) => {
                setAmount(next);
                setDepositError(null);
              }}
              placeholder="1.000,00"
              className="numeric"
              autoFocus
            />
          </FieldWrapper>
          <p className="flex items-start gap-1.5 text-[0.625rem] leading-relaxed text-mist-dim">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-3 shrink-0 text-gold"
            />
            O comprovante e a efetivação dependem do backend. A AureBid não
            confirma o depósito apenas no navegador.
          </p>
        </div>
      </Modal>
    </div>
  );
}
