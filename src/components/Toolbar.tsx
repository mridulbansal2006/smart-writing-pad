import type { CanvasTool } from './WritingCanvas';

export const PEN_COLORS = [
  { value: '#27333d', label: 'Dark grey' },
  { value: '#1f5c9e', label: 'Blue' },
  { value: '#1f7a4a', label: 'Green' },
  { value: '#a3321f', label: 'Red' },
  { value: '#6b3fa0', label: 'Purple' },
  { value: '#c2691f', label: 'Orange' },
] as const;

type Props = {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  penColor: string;
  onPenColorChange: (color: string) => void;
  penWidth: number;
  onPenWidthChange: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

/** Pen, colour, thickness, eraser, undo/redo and clear. */
export function Toolbar({
  tool,
  onToolChange,
  penColor,
  onPenColorChange,
  penWidth,
  onPenWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
}: Props) {
  return (
    <div className="card flex flex-wrap items-center gap-x-6 gap-y-4 p-4">
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Writing tool"
      >
        <button
          type="button"
          className={`btn ${tool === 'pen' ? 'btn-primary' : ''}`}
          aria-pressed={tool === 'pen'}
          onClick={() => onToolChange('pen')}
        >
          ✏️ Pen
        </button>
        <button
          type="button"
          className={`btn ${tool === 'eraser' ? 'btn-primary' : ''}`}
          aria-pressed={tool === 'eraser'}
          onClick={() => onToolChange('eraser')}
        >
          🧽 Eraser
        </button>
      </div>

      <fieldset className="flex items-center gap-2 border-0 p-0">
        <legend className="sr-only">Pen colour</legend>
        {PEN_COLORS.map((color) => {
          const selected = penColor.toLowerCase() === color.value;
          return (
            <button
              key={color.value}
              type="button"
              title={color.label}
              aria-label={`${color.label} pen`}
              aria-pressed={selected}
              onClick={() => onPenColorChange(color.value)}
              className="h-10 w-10 rounded-full border-2 transition-transform"
              style={{
                backgroundColor: color.value,
                borderColor: selected ? 'var(--color-accent)' : 'var(--color-line)',
                transform: selected ? 'scale(1.12)' : undefined,
              }}
            />
          );
        })}
      </fieldset>

      <div className="flex min-w-48 flex-1 items-center gap-3">
        <label htmlFor="pen-width" className="text-sm font-bold whitespace-nowrap">
          Thickness
        </label>
        <input
          id="pen-width"
          type="range"
          min={2}
          max={24}
          step={1}
          value={penWidth}
          onChange={(event) => onPenWidthChange(Number(event.target.value))}
          className="h-2 flex-1 accent-[var(--color-brand)]"
        />
        <span className="w-10 text-right text-sm tabular-nums">{penWidth}</span>
      </div>

      <div className="flex items-center gap-2" role="group" aria-label="History">
        <button type="button" className="btn" onClick={onUndo} disabled={!canUndo}>
          ↶ Undo
        </button>
        <button type="button" className="btn" onClick={onRedo} disabled={!canRedo}>
          ↷ Redo
        </button>
        <button type="button" className="btn" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
