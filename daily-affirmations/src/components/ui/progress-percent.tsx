export function ProgressPercent({ percent }: { percent: number }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </span>
      {percent}%
    </span>
  );
}
