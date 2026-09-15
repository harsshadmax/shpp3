export function SweepBar({ running }: { running: boolean }) {
  if (!running) return null;
  return (
    <div className="h-1 w-full bg-[var(--surface-sunken)] rounded-full overflow-hidden">
      <div className="sweep-bar h-full bg-[var(--accent)]" />
    </div>
  );
}
