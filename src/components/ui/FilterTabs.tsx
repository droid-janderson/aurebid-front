import { cn } from '@/utils/cn';

export interface FilterTabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function FilterTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: Array<FilterTabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="scroll-thin flex gap-1 overflow-x-auto border-b border-line/70 pb-px"
    >
      {items.map((item) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-[0.8125rem] font-medium transition-colors',
              active
                ? 'border-gold text-gold'
                : 'border-transparent text-mist hover:text-chalk',
            )}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'numeric rounded-full border px-1.5 py-0.5 text-[0.625rem] leading-none',
                  active
                    ? 'border-gold/40 bg-gold/10 text-gold-bright'
                    : 'border-line text-mist-dim',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
