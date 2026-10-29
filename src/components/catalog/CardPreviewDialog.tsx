import type { ReactNode } from 'react';
import type { CatalogCard } from '@/types/domain';
import { CardImage } from '@/components/cards/CardImage';
import { Modal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-[0.6875rem] tracking-[0.06em] text-mist-dim uppercase">
        {label}
      </dt>
      <dd className="text-right text-[0.8125rem] text-chalk">{children}</dd>
    </div>
  );
}

export function CardPreviewDialog({
  card,
  open,
  onOpenChange,
  selected,
  onSelect,
}: {
  card: CatalogCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: boolean;
  onSelect: (card: CatalogCard) => void;
}) {
  if (!card) return null;

  const subtitle = [card.setName ?? card.setId, card.number ? `#${card.number}` : null]
    .filter(Boolean)
    .join(' · ');
  const types = card.types.length > 0 ? card.types.join(', ') : null;
  const subtypes = card.subtypes.length > 0 ? card.subtypes.join(', ') : null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={card.name}
      description={subtitle || undefined}
      className="max-h-[90vh] w-[min(92vw,52rem)] overflow-y-auto"
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="cursor-pointer"
            disabled={selected}
            onClick={() => {
              onSelect(card);
              onOpenChange(false);
            }}
          >
            {selected ? 'Carta selecionada' : 'Selecionar esta carta'}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <CardImage
          src={card.imageLarge ?? card.imageSmall}
          alt={`Carta ${card.name}`}
          className="mx-auto aspect-[3/4] w-full max-w-[18rem] rounded-xl"
          priority
        />

        <dl className="space-y-2.5 self-start">
          <MetaRow label="Coleção">{card.setName ?? card.setId}</MetaRow>
          <MetaRow label="Número">{card.number || '—'}</MetaRow>
          <MetaRow label="Raridade">{card.rarity ?? '—'}</MetaRow>
          <MetaRow label="Categoria">{card.supertype ?? '—'}</MetaRow>
          {types && <MetaRow label="Tipos">{types}</MetaRow>}
          {subtypes && <MetaRow label="Subtipos">{subtypes}</MetaRow>}
        </dl>
      </div>
    </Modal>
  );
}
