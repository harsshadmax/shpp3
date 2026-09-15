import { Check, X } from "lucide-react";
import type { VerificationStep } from "@/lib/store";

export function VerificationLines({ steps }: { steps: VerificationStep[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((s) => (
        <div key={s.key} className="flex items-center gap-2 text-[13px]">
          {s.passed ? (
            <Check size={14} className="shrink-0" color="var(--verified)" />
          ) : (
            <X size={14} className="shrink-0" color="var(--breach)" />
          )}
          <span className={s.passed ? "text-[var(--ink)]" : "text-[var(--breach)]"}>{s.label}</span>
          {s.detail && <span className="text-[12px] text-[var(--ink-faint)] font-mono-id">{s.detail}</span>}
        </div>
      ))}
    </div>
  );
}
