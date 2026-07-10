export function BarList({
  items,
  valueLabel = (v: number) => v.toLocaleString(),
}: {
  items: { name: string; value: number; sub?: string }[];
  valueLabel?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-gray-400">No data yet.</p>}
      {items.map((it) => (
        <div key={it.name}>
          <div className="flex justify-between text-xs text-gray-600 mb-0.5">
            <span className="truncate pr-2">
              {it.name}
              {it.sub && <span className="text-gray-400"> · {it.sub}</span>}
            </span>
            <span className="font-medium text-gray-900 shrink-0">{valueLabel(it.value)}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 rounded-full" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
