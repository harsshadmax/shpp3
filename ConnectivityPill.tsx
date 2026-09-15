"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useConnectivity } from "@/lib/store";

export function ConnectivityPill() {
  const conn = useConnectivity();

  if (!conn.effectiveOnline) {
    return (
      <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-[4px] border border-[var(--pending)] bg-[var(--pending-bg)] text-[11px] font-mono-id font-semibold uppercase text-[var(--pending)]">
        <WifiOff size={12} />
        OFFLINE
        {conn.queueCount > 0 && <span>· {conn.queueCount} QUEUED</span>}
      </span>
    );
  }

  if (conn.queueCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-[4px] border border-[var(--pending)] bg-[var(--pending-bg)] text-[11px] font-mono-id font-semibold uppercase text-[var(--pending)]">
        <RefreshCw size={12} />
        SYNCING…
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-[4px] border border-[var(--verified)] bg-[var(--verified-bg)] text-[11px] font-mono-id font-semibold uppercase text-[var(--verified)]">
      <Wifi size={12} />
      ONLINE · SYNCED
    </span>
  );
}
