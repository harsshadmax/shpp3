import { CHAIN_SIGNING_KEY, GENESIS_HASH, canonicalJSON, hmacSha256Hex, hmacVerify, sha256Hex } from "./crypto";
import type { CustodyEvent, Role } from "./types";

export interface NewEventInput {
  caseId: string;
  actorId: string;
  actorRole: Role;
  actorName: string;
  action: string;
  payload: Record<string, unknown>;
  deviceId: string;
  geoLabel: string;
  timestamp?: string;
  queued?: boolean;
}

function eventHashInput(e: Omit<CustodyEvent, "hash">): string {
  const { prevHash, ...rest } = e;
  return prevHash + canonicalJSON(rest);
}

export async function computeEventHash(e: Omit<CustodyEvent, "hash">): Promise<string> {
  return sha256Hex(eventHashInput(e));
}

/**
 * Appends a new custody event onto the chain for one case. `priorEvents`
 * must already be in chronological order; the new event's `prevHash` is the
 * last event's hash, or the genesis hash for the first event in a case.
 */
export async function appendEvent(
  priorEvents: CustodyEvent[],
  input: NewEventInput
): Promise<CustodyEvent> {
  const prevHash = priorEvents.length > 0 ? priorEvents[priorEvents.length - 1].hash : GENESIS_HASH;
  const base: Omit<CustodyEvent, "hash"> = {
    id: `evt-${input.caseId}-${priorEvents.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
    caseId: input.caseId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actorName: input.actorName,
    action: input.action,
    payload: input.payload,
    deviceId: input.deviceId,
    geoLabel: input.geoLabel,
    timestamp: input.timestamp ?? new Date().toISOString(),
    prevHash,
    queued: input.queued,
  };
  const hash = await computeEventHash(base);
  return { ...base, hash };
}

export interface ChainVerifyResult {
  valid: boolean;
  brokenAt?: string;
  brokenIndex?: number;
  checked: number;
}

/**
 * Recomputes every hash in a case's event chain from genesis and reports the
 * first point where continuity breaks — either a `prevHash` that doesn't
 * match the previous event, or a `hash` that doesn't match its own recomputed
 * value (i.e. the event's recorded content was mutated after the fact).
 */
export async function verifyChain(events: CustodyEvent[]): Promise<ChainVerifyResult> {
  let expectedPrev = GENESIS_HASH;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.prevHash !== expectedPrev) {
      return { valid: false, brokenAt: e.id, brokenIndex: i, checked: i + 1 };
    }
    const recomputed = await computeEventHash({
      id: e.id,
      caseId: e.caseId,
      actorId: e.actorId,
      actorRole: e.actorRole,
      actorName: e.actorName,
      action: e.action,
      payload: e.payload,
      deviceId: e.deviceId,
      geoLabel: e.geoLabel,
      timestamp: e.timestamp,
      prevHash: e.prevHash,
      queued: e.queued,
    });
    if (recomputed !== e.hash) {
      return { valid: false, brokenAt: e.id, brokenIndex: i, checked: i + 1 };
    }
    expectedPrev = e.hash;
  }
  return { valid: true, checked: events.length };
}

export async function signPayload(payload: Record<string, unknown>): Promise<string> {
  return hmacSha256Hex(CHAIN_SIGNING_KEY, canonicalJSON(payload));
}

export async function verifySignature(payload: Record<string, unknown>, sig: string): Promise<boolean> {
  return hmacVerify(CHAIN_SIGNING_KEY, canonicalJSON(payload), sig);
}

/**
 * Dev-only control for the FSL panel: mutates one historic event's payload
 * in place WITHOUT recomputing its hash, so the recorded hash silently stops
 * matching its content — exactly what an after-the-fact tamper would look
 * like. `verifyChain` then names this exact event as the break.
 */
export function tamperEventForDemo(events: CustodyEvent[], index: number): CustodyEvent[] {
  if (index < 0 || index >= events.length) return events;
  const target = events[index];
  const tamperedPayload = {
    ...target.payload,
    __tampered: true,
    note: "value altered after recording",
  };
  const next = [...events];
  next[index] = { ...target, payload: tamperedPayload };
  return next;
}
