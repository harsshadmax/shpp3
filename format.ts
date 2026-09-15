import type { CaseStatus } from "./types";
import type { ChipTone } from "@/components/ui/StatusChip";

export function statusTone(status: CaseStatus): ChipTone {
  switch (status) {
    case "COMPLETED":
      return "verified";
    case "INTEGRITY_COMPROMISED":
      return "breach";
    case "SEALED_AWAITING_RECEIPT":
    case "IN_TRANSIT_TO_FSL":
      return "pending";
    default:
      return "neutral";
  }
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return `${days}d ${rem}h`;
}

/** Ageing tone for custody-register rows: neutral < 24h, pending 24-72h, breach past 72h. */
export function ageingTone(hours: number): ChipTone {
  if (hours >= 72) return "breach";
  if (hours >= 24) return "pending";
  return "neutral";
}

export function shortHash(hash: string, len = 10): string {
  return `${hash.slice(0, len)}…`;
}
