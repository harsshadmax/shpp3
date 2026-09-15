import { AlertTriangle, Smartphone, MapPin } from "lucide-react";
import type { CustodyEvent } from "@/lib/types";
import { actionLabel } from "@/lib/actionLabels";
import { formatDateTime, formatDuration, ageingTone } from "@/lib/format";
import { StatusChip } from "@/components/ui/StatusChip";

function hoursBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 36e5;
}

export function CustodyTimeline({
  events,
  brokenEventId,
}: {
  events: CustodyEvent[];
  brokenEventId?: string;
}) {
  return (
    <div className="flex flex-col">
      {events.map((e, i) => {
        const broken = e.id === brokenEventId;
        const prev = events[i - 1];
        const gapHours = prev ? hoursBetween(prev.timestamp, e.timestamp) : 0;
        const showGap = prev && gapHours > 1;

        return (
          <div key={e.id}>
            {showGap && (
              <div className="flex items-center gap-3 pl-[15px]">
                <div className="w-px h-8 bg-[var(--border)]" />
                <StatusChip tone={ageingTone(gapHours)}>{formatDuration(gapHours)} elapsed</StatusChip>
              </div>
            )}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`h-[13px] w-[13px] rounded-full mt-1.5 shrink-0 border-2 ${
                    broken
                      ? "bg-[var(--breach)] border-[var(--breach)]"
                      : "bg-[var(--surface)] border-[var(--accent)]"
                  }`}
                />
                {i < events.length - 1 && <div className="w-px flex-1 min-h-[38px] bg-[var(--border)]" />}
              </div>

              <div className={`pb-6 flex-1 min-w-0 ${broken ? "" : ""}`}>
                <div
                  className={`rounded-[6px] border px-4 py-3 ${
                    broken ? "border-[var(--breach)] bg-[var(--breach-bg)]" : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-[13px] font-semibold ${broken ? "text-[var(--breach)]" : "text-[var(--ink)]"}`}>
                      {actionLabel(e.action)}
                    </span>
                    <span className="font-mono-id text-[11px] text-[var(--ink-faint)]">{formatDateTime(e.timestamp)}</span>
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--ink-muted)]">
                    {e.actorName} · {e.actorRole}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--ink-faint)]">
                    <span className="inline-flex items-center gap-1">
                      <Smartphone size={11} /> {e.deviceId}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} /> {e.geoLabel}
                    </span>
                    <span className="font-mono-id">hash {e.hash.slice(0, 12)}…</span>
                    {e.queued && <StatusChip tone="pending">Queued — synced offline</StatusChip>}
                  </div>
                  {broken && (
                    <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[var(--breach)]">
                      <AlertTriangle size={13} />
                      Recomputed hash does not match the recorded hash — chain integrity breaks here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
