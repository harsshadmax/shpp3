export interface QueuedWrite {
  eventId: string;
  caseId: string;
  action: string;
  queuedAt: string;
}

export interface AppendAckResult {
  ok: boolean;
  error?: string;
}

/**
 * Posts one custody mutation to /api/custody/append so the server can
 * re-check the actor's role against the action before it is acknowledged.
 * Used both for the immediate online path and when draining the offline
 * queue after connectivity returns.
 */
export async function postAppendAck(caseId: string, action: string): Promise<AppendAckResult> {
  try {
    const res = await fetch("/api/custody/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, action }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? `Server responded ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network unreachable" };
  }
}
