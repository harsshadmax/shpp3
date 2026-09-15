export type ChipTone = "verified" | "pending" | "breach" | "neutral";

const toneClasses: Record<ChipTone, string> = {
  verified: "text-[var(--verified)] bg-[var(--verified-bg)] border-[var(--verified)]",
  pending: "text-[var(--pending)] bg-[var(--pending-bg)] border-[var(--pending)]",
  breach: "text-[var(--breach)] bg-[var(--breach-bg)] border-[var(--breach)]",
  neutral: "text-[var(--ink-muted)] bg-[var(--surface-sunken)] border-[var(--border-strong)]",
};

export function StatusChip({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: ChipTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center h-5 px-2 rounded-[4px] border text-[11px] font-mono-id font-semibold uppercase tracking-wide whitespace-nowrap ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
