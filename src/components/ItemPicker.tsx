import { useMemo } from 'react';

import { useApp } from '../state/AppProvider';

type Props = {
  label: string;
  items: readonly string[];
  selected: string;
  onSelect: (item: string) => void;
};

/**
 * The row of letters, numbers or words to choose from. A tick marks targets
 * that have already met the tracing thresholds at least once on this device.
 */
export function ItemPicker({ label, items, selected, onSelect }: Props) {
  const { attempts } = useApp();
  const completed = useMemo(
    () => new Set(attempts.filter((a) => a.completed).map((a) => a.target)),
    [attempts],
  );

  return (
    <section aria-labelledby="item-picker-label" className="card p-3">
      <h2 id="item-picker-label" className="px-1 pb-2 text-sm font-bold text-[var(--color-ink-soft)]">
        {label}
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isSelected = item === selected;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(item)}
              className={[
                'relative min-w-12 rounded-xl border px-3 py-2 text-lg font-bold',
                item.length > 1 ? 'min-w-20' : '',
                isSelected
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-white'
                  : 'border-[var(--color-line)] bg-white hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]',
              ].join(' ')}
            >
              {item}
              {completed.has(item) && (
                <span
                  aria-label="already traced"
                  title="Already traced over"
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[var(--color-good)] text-[10px] text-white"
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
