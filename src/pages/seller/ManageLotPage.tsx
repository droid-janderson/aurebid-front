import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  ExternalLink,
  Gavel,
  Play,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { Lot, UpdateLotInput } from '@/types/domain';
import { lotsService } from '@/services/lots.service';
import { queryKeys } from '@/services/query-keys';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { LotStatusBadge, SettlementStatusBadge } from '@/components/ui/Badge';
import { FieldWrapper, Input, Select, Textarea } from '@/components/ui/Field';
import { Button, buttonStyles } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { CardImage } from '@/components/cards/CardImage';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  fieldErrorFor,
  presentError,
  type ErrorPresentation,
} from '@/utils/errors';
import { formatBRL, formatAmountInput, parseBRLInput } from '@/utils/money';
import {
  formatDateTime,
  toZonedInputValue,
  zonedInputToIso,
} from '@/utils/datetime';
import { primaryCardImage, cardSummaryLine } from '@/utils/product';
import { publicLotCode } from '@/utils/pseudonym';

const schema = z
  .object({
    title: z.string().min(3, 'Título deve ter ao menos 3 caracteres.').max(200),
    description: z.string().max(5000, 'Use no máximo 5000 caracteres.'),
    startingPrice: z.string().min(1, 'Informe o lance inicial.'),
    minimumIncrement: z.string().min(1, 'Informe o incremento mínimo.'),
    startsAt: z.string().min(1, 'Informe a data de início.'),
    endsAt: z.string().min(1, 'Informe o encerramento.'),
    status: z.enum(['DRAFT', 'SCHEDULED']),
  })
  .superRefine((values, ctx) => {
    const amount = parseBRLInput(values.startingPrice);
    if (amount === null || amount <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['startingPrice'],
        message: 'Informe um valor positivo.',
      });
    }
    const increment = parseBRLInput(values.minimumIncrement);
    if (increment === null || increment <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['minimumIncrement'],
        message: 'Informe um incremento positivo.',
      });
    }
    const startsAt = zonedInputToIso(values.startsAt);
    const endsAt = zonedInputToIso(values.endsAt);
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'O encerramento precisa ser posterior ao início.',
      });
    }
  });

type LotForm = z.infer<typeof schema>;

type PendingAction = 'publish' | 'cancel' | 'delete' | 'end' | null;

function formValues(lot: Lot): LotForm {
  return {
    title: lot.title,
    description: lot.description ?? '',
    startingPrice: formatAmountInput(lot.startingPrice),
    minimumIncrement: formatAmountInput(lot.minimumIncrement),
    startsAt: toZonedInputValue(lot.startsAt),
    endsAt: toZonedInputValue(lot.endsAt),
    status: lot.status === 'DRAFT' ? 'DRAFT' : 'SCHEDULED',
  };
}

export function ManageLotPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<ErrorPresentation | null>(null);

  const lotQuery = useQuery({
    queryKey: queryKeys.lots.managed(lotId ?? ''),
    queryFn: () => lotsService.getManaged(lotId!),
    enabled: Boolean(lotId),
  });

  const lot = lotQuery.data;
  useDocumentTitle(lot ? `Gerenciar ${lot.title}` : 'Gerenciar lote');

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<LotForm>({
    resolver: zodResolver(schema),
    defaultValues: lot
      ? formValues(lot)
      : {
          title: '',
          description: '',
          startingPrice: '',
          minimumIncrement: '',
          startsAt: '',
          endsAt: '',
          status: 'DRAFT',
        },
  });

  useEffect(() => {
    if (lot) reset(formValues(lot));
  }, [lot, reset]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.summary }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.managed(lotId ?? '') }),
      ...(lotId
        ? [queryClient.invalidateQueries({ queryKey: queryKeys.lots.detail(lotId) })]
        : []),
    ]);
  };

  const save = handleSubmit(async (values) => {
    if (!lot) return;
    setFormError(null);
    const startingPrice = parseBRLInput(values.startingPrice);
    const minimumIncrement = parseBRLInput(values.minimumIncrement);
    const startsAt = zonedInputToIso(values.startsAt);
    const endsAt = zonedInputToIso(values.endsAt);

    if (startingPrice === null || minimumIncrement === null || !startsAt || !endsAt) {
      setFormError({
        title: 'Campos inválidos',
        message: 'Confira valores e datas antes de salvar.',
        tone: 'warning',
      });
      return;
    }

    const payload: UpdateLotInput = {
      title: values.title,
      description: values.description.trim() || undefined,
      startingPrice,
      minimumIncrement,
      startsAt,
      endsAt,
      status: values.status,
    };

    try {
      const updated = await lotsService.update(lot.id, payload);
      push({
        title: 'Lote atualizado',
        description: 'As alterações foram confirmadas pelo servidor.',
        tone: 'success',
      });
      reset(formValues(updated));
      await invalidate();
    } catch (error) {
      (['title', 'description', 'startingPrice', 'minimumIncrement', 'startsAt', 'endsAt'] as const).forEach(
        (field) => {
          const message = fieldErrorFor(error, field);
          if (message) setError(field, { message });
        },
      );
      setFormError(presentError(error));
    }
  });

  const runAction = async () => {
    if (!lot || !pendingAction) return;
    setActionLoading(true);
    setFormError(null);
    try {
      if (pendingAction === 'publish') {
        await lotsService.publish(lot.id);
        push({
          title: 'Lote publicado',
          description:
            lot.startsAt <= new Date().toISOString()
              ? 'O lote está ao vivo e recebe lances.'
              : 'O lote está agendado para a data definida.',
          tone: 'success',
        });
      }
      if (pendingAction === 'cancel') {
        await lotsService.cancel(lot.id);
        push({
          title: 'Lote cancelado',
          description: 'As reservas vinculadas a este lote foram liberadas.',
          tone: 'info',
        });
      }
      if (pendingAction === 'end') {
        await lotsService.end(lot.id);
        push({
          title: 'Leilão encerrado',
          description: 'A apuração e a liquidação seguem no servidor.',
          tone: 'success',
        });
      }
      if (pendingAction === 'delete') {
        await lotsService.remove(lot.id);
        push({ title: 'Rascunho excluído', tone: 'info' });
        await invalidate();
        navigate('/painel');
        return;
      }
      await invalidate();
      await lotQuery.refetch();
    } catch (error) {
      const presentation = presentError(error);
      setFormError(presentation);
      push({
        title: presentation.title,
        description: presentation.message,
        tone: presentation.tone,
      });
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  if (!lotId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <ErrorState title="Lote não informado" message="O endereço está incompleto." />
      </div>
    );
  }

  if (lotQuery.isPending) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-5 h-12 w-2/3" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-[28rem] rounded-xl" />
        </div>
      </div>
    );
  }

  if (lotQuery.isError || !lot) {
    const error = presentError(lotQuery.error);
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <ErrorState
          title={error.title}
          message={error.message}
          onRetry={() => void lotQuery.refetch()}
          action={
            <Link to="/painel" className={buttonStyles('secondary', 'sm')}>
              Voltar ao painel
            </Link>
          }
        />
      </div>
    );
  }

  const editable = lot.status === 'DRAFT' || lot.status === 'SCHEDULED';
  const canDelete = lot.status === 'DRAFT';
  const canCancel = !['ENDED', 'SETTLED', 'CANCELLED'].includes(lot.status);
  const canEnd = lot.status === 'ACTIVE';
  const canPublish = editable;

  const confirmCopy: Record<Exclude<PendingAction, null>, { title: string; description: string; label: string; tone: 'danger' | 'primary' }> = {
    publish: {
      title: 'Publicar este lote?',
      description:
        'O lote passa a seguir a agenda do servidor e, se a data de início já passou, começa a receber lances imediatamente.',
      label: 'Publicar',
      tone: 'primary',
    },
    cancel: {
      title: 'Cancelar este lote?',
      description:
        'O lote sai da vitrine e as reservas de saldo dos lances ativos são liberadas. Esta ação não pode ser desfeita.',
      label: 'Cancelar lote',
      tone: 'danger',
    },
    end: {
      title: 'Encerrar o leilão agora?',
      description:
        'O servidor apura o maior lance e cria a liquidação. Novos lances deixam de ser aceitos imediatamente.',
      label: 'Encerrar agora',
      tone: 'danger',
    },
    delete: {
      title: 'Excluir este rascunho?',
      description:
        'O rascunho será removido da sua lista. Esta ação é definitiva.',
      label: 'Excluir rascunho',
      tone: 'danger',
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/painel"
        className="inline-flex items-center gap-2 text-xs font-medium text-mist transition-colors hover:text-chalk"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Voltar ao painel
      </Link>

      <PageHeader
        className="mt-5"
        eyebrow={`Lote ${publicLotCode(lot.id)} · ${cardSummaryLine(lot) || lot.productSource}`}
        title={lot.title}
        description={
          editable
            ? 'Ajuste os dados enquanto o lote não entrou em disputa. Alterações são validadas pelo servidor.'
            : 'Este lote já iniciou a operação. Os dados ficam somente para consulta; use as ações disponíveis para conduzir o encerramento.'
        }
        actions={
          <>
            <Link to={`/lotes/${lot.id}`} className={buttonStyles('secondary', 'sm')}>
              <ExternalLink aria-hidden="true" className="size-3.5" />
              Ver na vitrine
            </Link>
            <Link
              to={`/lotes/${lot.id}/auditoria`}
              className={buttonStyles('ghost', 'sm')}
            >
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Auditoria
            </Link>
          </>
        }
      />

      {formError && (
        <InlineAlert tone={formError.tone} title={formError.title} className="mt-6">
          {formError.message}
        </InlineAlert>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <aside className="space-y-4">
          <div className="surface p-4">
            <CardImage
              src={primaryCardImage(lot)}
              alt={`Carta ${lot.title}`}
              className="aspect-[3/4] w-full"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <LotStatusBadge status={lot.status} />
              <span className="numeric text-lg text-gold-bright">
                {formatBRL(lot.currentPrice)}
              </span>
            </div>
            <dl className="mt-4 space-y-2.5 border-t border-line/70 pt-3 text-[0.75rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-mist-dim">Lance inicial</dt>
                <dd className="numeric text-chalk">{formatBRL(lot.startingPrice)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mist-dim">Incremento</dt>
                <dd className="numeric text-chalk">
                  {formatBRL(lot.minimumIncrement)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mist-dim">Lances</dt>
                <dd className="numeric text-chalk">{lot.bidCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mist-dim">Início</dt>
                <dd className="numeric text-chalk">{formatDateTime(lot.startsAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mist-dim">Encerramento</dt>
                <dd className="numeric text-chalk">{formatDateTime(lot.endsAt)}</dd>
              </div>
            </dl>
          </div>

          {lot.settlement && (
            <div className="surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow">Liquidação</p>
                <SettlementStatusBadge status={lot.settlement.status} />
              </div>
              <p className="numeric mt-2 text-lg text-chalk">
                {formatBRL(lot.settlement.amount)}
              </p>
              <p className="mt-1 font-mono text-[0.625rem] text-mist-dim">
                {lot.settlement.receiptNumber}
              </p>
              <Link
                to={`/recibo/${lot.settlement.publicToken}`}
                className={buttonStyles('secondary', 'sm', 'mt-3 w-full')}
              >
                Abrir recibo público
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          )}

          <div className="surface p-4">
            <p className="eyebrow">Ações</p>
            <div className="mt-3 grid gap-2">
              {canPublish && (
                <Button
                  size="sm"
                  onClick={() => setPendingAction('publish')}
                  leftIcon={<Play aria-hidden="true" className="size-3.5" />}
                >
                  Publicar lote
                </Button>
              )}
              {canEnd && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPendingAction('end')}
                  leftIcon={<Gavel aria-hidden="true" className="size-3.5" />}
                >
                  Encerrar agora
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setPendingAction('cancel')}
                  leftIcon={<Ban aria-hidden="true" className="size-3.5" />}
                >
                  Cancelar lote
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingAction('delete')}
                  className="text-loss hover:bg-loss/10"
                  leftIcon={<Trash2 aria-hidden="true" className="size-3.5" />}
                >
                  Excluir rascunho
                </Button>
              )}
              {!canPublish && !canEnd && !canCancel && !canDelete && (
                <p className="text-xs leading-relaxed text-mist-dim">
                  Nenhuma ação de condução disponível para esta situação.
                </p>
              )}
            </div>
          </div>
        </aside>

        <section className="surface p-5 sm:p-6">
          <h2 className="font-display text-xl text-chalk">Dados do lote</h2>
          <p className="mt-1 text-xs text-mist-dim">
            {editable
              ? 'Campos editáveis até o lote entrar ao vivo.'
              : 'Somente leitura após o início da disputa.'}
          </p>

          <form onSubmit={save} noValidate className="mt-5 space-y-4">
            <FieldWrapper
              label="Título"
              htmlFor="manage-title"
              error={errors.title?.message}
              required
            >
              <Input
                id="manage-title"
                disabled={!editable}
                invalid={Boolean(errors.title)}
                {...register('title')}
              />
            </FieldWrapper>

            <FieldWrapper
              label="Descrição"
              htmlFor="manage-description"
              error={errors.description?.message}
            >
              <Textarea
                id="manage-description"
                disabled={!editable}
                invalid={Boolean(errors.description)}
                {...register('description')}
              />
            </FieldWrapper>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldWrapper
                label="Lance inicial (R$)"
                htmlFor="manage-starting"
                error={errors.startingPrice?.message}
                required
              >
                <Input
                  id="manage-starting"
                  inputMode="decimal"
                  disabled={!editable}
                  className="numeric"
                  invalid={Boolean(errors.startingPrice)}
                  {...register('startingPrice')}
                />
              </FieldWrapper>
              <FieldWrapper
                label="Incremento (R$)"
                htmlFor="manage-increment"
                error={errors.minimumIncrement?.message}
                required
              >
                <Input
                  id="manage-increment"
                  inputMode="decimal"
                  disabled={!editable}
                  className="numeric"
                  invalid={Boolean(errors.minimumIncrement)}
                  {...register('minimumIncrement')}
                />
              </FieldWrapper>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldWrapper
                label="Início"
                htmlFor="manage-starts"
                error={errors.startsAt?.message}
                required
              >
                <Input
                  id="manage-starts"
                  type="datetime-local"
                  disabled={!editable}
                  className="numeric text-[0.8125rem]"
                  invalid={Boolean(errors.startsAt)}
                  {...register('startsAt')}
                />
              </FieldWrapper>
              <FieldWrapper
                label="Encerramento"
                htmlFor="manage-ends"
                error={errors.endsAt?.message}
                required
              >
                <Input
                  id="manage-ends"
                  type="datetime-local"
                  disabled={!editable}
                  className="numeric text-[0.8125rem]"
                  invalid={Boolean(errors.endsAt)}
                  {...register('endsAt')}
                />
              </FieldWrapper>
            </div>

            <FieldWrapper
              label="Situação"
              htmlFor="manage-status"
              hint="Publicar move o lote para a agenda do servidor."
            >
              <Select id="manage-status" disabled={!editable} {...register('status')}>
                <option value="DRAFT">Rascunho</option>
                <option value="SCHEDULED">Agendado</option>
              </Select>
            </FieldWrapper>

            {editable && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
                <p className="text-[0.6875rem] text-mist-dim">
                  {isDirty
                    ? 'Há alterações não salvas.'
                    : 'Todos os dados estão sincronizados com o servidor.'}
                </p>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={!isDirty}
                  leftIcon={<Save aria-hidden="true" className="size-4" />}
                >
                  Salvar alterações
                </Button>
              </div>
            )}
          </form>
        </section>
      </div>

      {pendingAction && (
        <ConfirmDialog
          open={Boolean(pendingAction)}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null);
          }}
          title={confirmCopy[pendingAction].title}
          description={confirmCopy[pendingAction].description}
          confirmLabel={confirmCopy[pendingAction].label}
          tone={confirmCopy[pendingAction].tone}
          loading={actionLoading}
          onConfirm={() => void runAction()}
        />
      )}
    </div>
  );
}
