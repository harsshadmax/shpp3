import { ConnectivityPill } from "@/components/ui/ConnectivityPill";

export function TopBar({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="h-[56px] shrink-0 flex items-center justify-between px-6 border-b border-[var(--border-strong)] bg-[var(--bg)]">
      <h1 className="text-[20px] font-semibold text-[var(--ink)]">{title}</h1>
      <div className="flex items-center gap-3">
        {actions}
        <ConnectivityPill />
      </div>
    </div>
  );
}
