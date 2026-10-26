import { Search, SlidersHorizontal } from 'lucide-react';
import type { LotStatus } from '@/types/domain';
import { Input, Select } from '@/components/ui/Field';
import { cn } from '@/utils/cn';

export interface LotFilterState {
  search: string;
  status: LotStatus | '';
  sort: 'ending' | 'startingPrice' | 'newest';
}

export function LotFilters({
  value,
  onChange,
  className,
}: {
  value: LotFilterState;
  onChange: (next: LotFilterState) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-3 rounded-xl border border-line bg-raised/40 p-3 sm:grid-cols-[1fr_auto_auto]',
        className,
      )}
      role="search"
      aria-label="Filtrar lotes"
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist-dim"
        />
        <Input
          type="search"
          value={value.search}
          onChange={(event) => onChange({ ...value, search: event.target.value })}
          placeholder="Buscar por carta, coleção ou código"
          className="pl-9"
          aria-label="Buscar lotes"
        />
      </div>

      <div className="flex items-center gap-2">
        <SlidersHorizontal
          aria-hidden="true"
          className="hidden size-4 shrink-0 text-mist-dim sm:block"
        />
        <Select
          value={value.status}
          onChange={(event) =>
            onChange({ ...value, status: event.target.value as LotStatus | '' })
          }
          aria-label="Filtrar por situação"
          className="min-w-[10.5rem]"
        >
          <option value="">Todas as situações</option>
          <option value="ACTIVE">Ao vivo</option>
          <option value="SCHEDULED">Agendados</option>
          <option value="ENDED">Encerrados</option>
          <option value="SETTLED">Liquidados</option>
        </Select>
      </div>

      <Select
        value={value.sort}
        onChange={(event) =>
          onChange({
            ...value,
            sort: event.target.value as LotFilterState['sort'],
          })
        }
        aria-label="Ordenar lotes"
        className="min-w-[11rem]"
      >
        <option value="ending">Encerram primeiro</option>
        <option value="startingPrice">Menor lance inicial</option>
        <option value="newest">Mais recentes</option>
      </Select>
    </div>
  );
}
