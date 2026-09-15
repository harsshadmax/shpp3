import { supabase, isSupabaseConfigured } from "./supabase";
import { useMemo, useSyncExternalStore } from "react";
import { appendEvent, signPayload, tamperEventForDemo, verifyChain, verifySignature, type ChainVerifyResult } from "./chain";
import { detectAnomaliesForCase } from "./anomalies";
import { postAppendAck, type QueuedWrite } from "./offlineQueue";
import { buildSeedData } from "./seed";
import { GENESIS_HASH } from "./crypto";
import {
  CASE_STATUS_LABELS,
  EXAM_STEPS,
  type Anomaly,
  type CaseRecord,
  type CustodyEvent,
  type CustodyStage,
  type ExamStep,
  type Role,
  type SealPayload,
  type SessionUser,
  type Specimen,
  type SpecimenLabel,
} from "./types";

const STORAGE_KEY = "saec-guard:v1";
const DEVICE_KEY = "saec-guard:deviceId";

interface StoreState {
  cases: CaseRecord[];
  specimensByCase: Record<string, Specimen[]>;
  eventsByCase: Record<string, CustodyEvent[]>;
  allEvents: CustodyEvent[];
  anomalies: Anomaly[];
  offlineQueue: QueuedWrite[];
  online: boolean;
  simulateOffline: boolean;
  currentUser: SessionUser | null;
  hydrated: boolean;
}

let state: StoreState = {
  cases: [],
  specimensByCase: {},
  eventsByCase: {},
  allEvents: [],
  anomalies: [],
  offlineQueue: [],
  online: true,
  simulateOffline: false,
  currentUser: null,
  hydrated: false,
};

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  persist();
  emit();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function isBrowser() {
  return typeof window !== "undefined";
}

function persist() {
  if (!isBrowser() || !state.hydrated) return;
  try {
    const payload = {
      cases: state.cases,
      specimensByCase: state.specimensByCase,
      eventsByCase: state.eventsByCase,
      allEvents: state.allEvents,
      anomalies: state.anomalies,
      offlineQueue: state.offlineQueue,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage unavailable — demo continues in-memory only
  }
}

export function getDeviceId(): string {
  if (!isBrowser()) return "device-server";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `device-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

let hydrationPromise: Promise<void> | null = null;

export function ensureHydrated(): Promise<void> {
  if (!isBrowser()) return Promise.resolve();
  if (state.hydrated) return Promise.resolve();
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.cases) && parsed.cases.length > 0) {
          setState({ ...parsed, online: navigator.onLine, hydrated: true });
          return;
        }
      } catch {
        // fall through to reseed
      }
    }
    await reseed();
  })();
  return hydrationPromise;
}

export async function resetDemoData(): Promise<void> {
  hydrationPromise = null;
  await reseed();
}

async function reseed(): Promise<void> {
  const seed = await buildSeedData();
  const anomalies = await computeAllAnomalies(seed.cases, seed.eventsByCase, seed.specimensByCase);
  setState({
    ...seed,
    anomalies,
    offlineQueue: [],
    online: isBrowser() ? navigator.onLine : true,
    hydrated: true,
  });
}

async function computeAllAnomalies(
  cases: CaseRecord[],
  eventsByCase: Record<string, CustodyEvent[]>,
  specimensByCase: Record<string, Specimen[]>
): Promise<Anomaly[]> {
  const out: Anomaly[] = [];
  for (const c of cases) {
    const events = eventsByCase[c.id] ?? [];
    const chainResult = await verifyChain(events);
    out.push(
      ...detectAnomaliesForCase(c, events, specimensByCase[c.id] ?? [], chainResult.valid, chainResult.brokenAt)
    );
  }
  return out;
}

/** Recomputes the anomaly list for one case, using a real cryptographic recompute of its chain. */
async function recomputeAnomaliesForCase(caseId: string) {
  const others = state.anomalies.filter((a) => a.caseId !== caseId);
  const c = state.cases.find((x) => x.id === caseId);
  if (!c) {
    setState({ anomalies: others });
    return;
  }
  const events = state.eventsByCase[caseId] ?? [];
  const chainResult = await verifyChain(events);
  const next = detectAnomaliesForCase(
    c,
    events,
    state.specimensByCase[caseId] ?? [],
    chainResult.valid,
    chainResult.brokenAt
  );
  setState({ anomalies: [...others, ...next] });
}

// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------

let connectivityWired = false;
export function wireConnectivityListeners() {
  if (!isBrowser() || connectivityWired) return;
  connectivityWired = true;
  setState({ online: navigator.onLine });
  window.addEventListener("online", () => {
    setState({ online: true });
    void drainOfflineQueue();
  });
  window.addEventListener("offline", () => setState({ online: false }));
}

export function isEffectivelyOnline(): boolean {
  return state.online && !state.simulateOffline;
}

export function toggleSimulateOffline() {
  const next = !state.simulateOffline;
  setState({ simulateOffline: next });
  if (!next && state.online) void drainOfflineQueue();
}

async function drainOfflineQueue() {
  const pending = state.offlineQueue;
  if (pending.length === 0) return;
  for (const item of pending) {
    const ack = await postAppendAck(item.caseId, item.action);
    const syncedAt = new Date().toISOString();
    const events = (state.eventsByCase[item.caseId] ?? []).map((e) =>
      e.id === item.eventId ? { ...e, queued: false, syncedAt } : e
    );
    setState({
      eventsByCase: { ...state.eventsByCase, [item.caseId]: events },
      allEvents: state.allEvents.map((e) => (e.id === item.eventId ? { ...e, queued: false, syncedAt } : e)),
      offlineQueue: state.offlineQueue.filter((q) => q.eventId !== item.eventId),
    });
    if (!ack.ok) {
      // best-effort demo sync; leave marked synced locally regardless so the UI keeps moving
    }
    recomputeAnomaliesForCase(item.caseId);
  }
}

export function setCurrentUser(user: SessionUser | null) {
  setState({ currentUser: user });
}

// ---------------------------------------------------------------------------
// React bindings
// ---------------------------------------------------------------------------

export function useStoreValue<T>(selector: (s: StoreState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export function useHydrated() {
  return useStoreValue((s) => s.hydrated);
}
export function useCases() {
  return useStoreValue((s) => s.cases);
}
export function useCase(caseId: string) {
  return useStoreValue((s) => s.cases.find((c) => c.id === caseId));
}
export function useSpecimens(caseId: string) {
  return useStoreValue((s) => s.specimensByCase[caseId] ?? EMPTY_SPECIMENS);
}
export function useEvents(caseId: string) {
  return useStoreValue((s) => s.eventsByCase[caseId] ?? EMPTY_EVENTS);
}
export function useAllEvents() {
  return useStoreValue((s) => s.allEvents);
}
export function useAnomalies() {
  return useStoreValue((s) => s.anomalies);
}
export function useCaseAnomalies(caseId: string) {
  const anomalies = useStoreValue((s) => s.anomalies);
  return useMemo(() => anomalies.filter((a) => a.caseId === caseId), [anomalies, caseId]);
}
export function useCurrentUser() {
  return useStoreValue((s) => s.currentUser);
}
export function useConnectivity() {
  const online = useStoreValue((s) => s.online);
  const simulateOffline = useStoreValue((s) => s.simulateOffline);
  const queueCount = useStoreValue((s) => s.offlineQueue.length);
  return useMemo(
    () => ({ online, simulateOffline, effectiveOnline: online && !simulateOffline, queueCount }),
    [online, simulateOffline, queueCount]
  );
}

const EMPTY_SPECIMENS: Specimen[] = [];
const EMPTY_EVENTS: CustodyEvent[] = [];

// ---------------------------------------------------------------------------
// Write path: role-checked ack, chain append, local commit + Supabase
// ---------------------------------------------------------------------------

async function recordEvent(input: {
  caseId: string;
  actorRole: Role;
  action: string;
  payload: Record<string, unknown>;
}): Promise<CustodyEvent> {
  const user = state.currentUser;
  if (!user) throw new Error("No authenticated user in session");

  const prior = state.eventsByCase[input.caseId] ?? [];
  const online = isEffectivelyOnline();

  const evt = await appendEvent(prior, {
    caseId: input.caseId,
    actorId: user.userId,
    actorRole: input.actorRole,
    actorName: user.name,
    action: input.action,
    payload: input.payload,
    deviceId: getDeviceId(),
    geoLabel: user.org,
    queued: !online,
  });

  const nextEvents = [...prior, evt];
  setState({
    eventsByCase: { ...state.eventsByCase, [input.caseId]: nextEvents },
    allEvents: [...state.allEvents, evt],
  });

  if (online) {
    const ack = await postAppendAck(input.caseId, input.action);
    if (!ack.ok) {
      setState({
        offlineQueue: [
          ...state.offlineQueue,
          { eventId: evt.id, caseId: input.caseId, action: input.action, queuedAt: new Date().toISOString() },
        ],
      });
    }

    // Mirror to Supabase custody_logs table
    if (isSupabaseConfigured) {
      void supabase
      .from("custody_logs")
      .insert([
        {
          case_id: input.caseId,
          stage: input.action,
          releasing_actor: null,
          receiving_actor: user.name,
          seal_code: (input.payload?.sealNo as string) || null,
          prev_hash: evt.prevHash,
          current_hash: evt.hash,
          is_anomaly: false,
          created_at: evt.timestamp,
        },
      ])
      .then(({ error }) => {
        if (error) console.warn("Supabase custody sync:", error.message);
      });
    }
  } else {
    setState({
      offlineQueue: [
        ...state.offlineQueue,
        { eventId: evt.id, caseId: input.caseId, action: input.action, queuedAt: new Date().toISOString() },
      ],
    });
  }

  recomputeAnomaliesForCase(input.caseId);
  return evt;
}

function updateCase(caseId: string, patch: Partial<CaseRecord>) {
  setState({
    cases: state.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)),
  });

  if (isEffectivelyOnline() && isSupabaseConfigured) {
    void supabase
      .from("cases")
      .update({
        status: patch.status,
        current_stage: patch.currentStage,
        custodian_name: patch.custodianName,
        seal_no: patch.sealNo,
        sealed_at: patch.sealedAt,
        transfer_code: patch.transferCode,
        transfer_code_expires_at: patch.transferCodeExpiresAt,
        transfer_code_used: patch.transferCodeUsed,
        receiving_station: patch.receivingStation,
        receiving_officer: patch.receivingOfficer,
      })
      .eq("id", caseId)
      .then(({ error }) => {
        if (error) console.warn("Supabase case update sync:", error.message);
      });
  }
}

function nextCaseId(): string {
  const year = new Date().getFullYear();
  const nums = state.cases
    .map((c) => Number(c.id.split("-").pop()))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 100) + 1;
  return `SAEC-${year}-${String(next).padStart(4, "0")}`;
}

function genDigits(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

// ---------------------------------------------------------------------------
// Medical Officer actions
// ---------------------------------------------------------------------------

export async function createCase(input: {
  hospital: string;
  mlcNumber: string;
  policeStation: string;
  examiningOfficer: string;
  ageBand: string;
  sex: "F" | "M" | "X";
}): Promise<CaseRecord> {
  const user = state.currentUser;
  if (!user) throw new Error("No authenticated user in session");
  const id = nextCaseId();
  const now = new Date().toISOString();
  const record: CaseRecord = {
    id,
    ...input,
    status: "EXAMINATION_IN_PROGRESS",
    stepIndex: 0,
    createdAt: now,
    currentStage: "MO",
    custodianName: user.name,
    custodianOrg: user.org,
    stageEnteredAt: now,
    transferCodeUsed: false,
  };
  setState({ cases: [record, ...state.cases], specimensByCase: { ...state.specimensByCase, [id]: [] } });
  await recordEvent({ caseId: id, actorRole: "MO", action: "CASE_CREATED", payload: { ...input } });

  if (isEffectivelyOnline() && isSupabaseConfigured) {
    void supabase
      .from("cases")
      .insert([
        {
          id,
          hospital: input.hospital,
          mlc_number: input.mlcNumber,
          police_station: input.policeStation,
          examining_officer: input.examiningOfficer,
          age_band: input.ageBand,
          sex: input.sex,
          status: record.status,
          current_stage: record.currentStage,
          custodian_name: record.custodianName,
          created_at: now,
        },
      ])
      .then(({ error }) => {
        if (error) console.warn("Supabase case create sync:", error.message);
      });
  }

  recomputeAnomaliesForCase(id);
  return record;
}

export async function addSpecimen(
  caseId: string,
  input: { label: SpecimenLabel; container: string }
): Promise<Specimen> {
  const list = state.specimensByCase[caseId] ?? [];
  const specimen: Specimen = {
    id: `${caseId}-S${String(list.length + 1).padStart(2, "0")}`,
    caseId,
    label: input.label,
    container: input.container,
    collectedAt: new Date().toISOString(),
  };
  setState({ specimensByCase: { ...state.specimensByCase, [caseId]: [...list, specimen] } });
  await recordEvent({
    caseId,
    actorRole: "MO",
    action: "SPECIMEN_ADDED",
    payload: { specimenId: specimen.id, label: specimen.label, container: specimen.container },
  });

  if (isEffectivelyOnline() && isSupabaseConfigured) {
    void supabase
      .from("specimens")
      .insert([
        {
          id: specimen.id,
          case_id: caseId,
          label: specimen.label,
          container: specimen.container,
          collected_at: specimen.collectedAt,
        },
      ])
      .then(({ error }) => {
        if (error) console.warn("Supabase specimen sync:", error.message);
      });
  }

  return specimen;
}

export async function advanceStep(
  caseId: string,
  step: ExamStep,
  extra?: Record<string, unknown>
): Promise<{ sealPayload?: SealPayload }> {
  const c = state.cases.find((x) => x.id === caseId);
  if (!c) throw new Error("Case not found");
  const idx = EXAM_STEPS.indexOf(step);
  if (idx !== c.stepIndex) throw new Error("Steps must be completed in order");

  const action = step === "HANDOVER_INITIATED" ? step : `STEP_${step}`;
  let payload: Record<string, unknown> = extra ?? {};
  let sealPayload: SealPayload | undefined;
  const casePatch: Partial<CaseRecord> = { stepIndex: idx + 1 };

  if (step === "KIT_OPENED") {
    casePatch.kitSerial = extra?.kitSerial as string;
  }

  if (step === "SEALED") {
    const events = state.eventsByCase[caseId] ?? [];
    const chainHash = events.length > 0 ? events[events.length - 1].hash : GENESIS_HASH;
    const sealNo = `SEAL-${genDigits(5)}`;
    const sealedAt = new Date().toISOString();
    const specimens = state.specimensByCase[caseId] ?? [];
    const base = {
      caseId,
      specimenIds: specimens.map((s) => s.id),
      sealNo,
      sealedAt,
      chainHash,
    };
    const sig = await signPayload(base);
    sealPayload = { ...base, sig };
    payload = { ...base, sig };
    casePatch.sealNo = sealNo;
    casePatch.sealedAt = sealedAt;
  }

  if (step === "HANDOVER_INITIATED") {
    const transferCode = genDigits(6);
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    casePatch.transferCode = transferCode;
    casePatch.transferCodeExpiresAt = expiresAt;
    casePatch.transferCodeUsed = false;
    casePatch.receivingStation = (extra?.receivingStation as string) ?? c.policeStation;
    casePatch.receivingOfficer = extra?.receivingOfficer as string;
    casePatch.status = "SEALED_AWAITING_RECEIPT";
    payload = { ...payload, transferCode, receivingStation: casePatch.receivingStation, receivingOfficer: casePatch.receivingOfficer };
  }

  updateCase(caseId, casePatch);
  await recordEvent({ caseId, actorRole: "MO", action, payload });
  return { sealPayload };
}

// ---------------------------------------------------------------------------
// Verification (read-only) shared by Police + FSL receive screens
// ---------------------------------------------------------------------------

export interface VerificationStep {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface VerifyIncomingResult {
  ok: boolean;
  steps: VerificationStep[];
  caseId?: string;
  parsedPayload?: SealPayload;
  error?: string;
}

export async function verifyIncoming(input: {
  qrPayloadRaw: string;
  transferCode: string;
}): Promise<VerifyIncomingResult> {
  let payload: SealPayload;
  try {
    payload = JSON.parse(input.qrPayloadRaw);
  } catch {
    return { ok: false, steps: [], error: "QR payload is not valid JSON" };
  }
  if (!payload.caseId || !payload.sealNo || !payload.sig) {
    return { ok: false, steps: [], error: "QR payload is missing required fields" };
  }

  const c = state.cases.find((x) => x.id === payload.caseId);
  if (!c) {
    return { ok: false, steps: [], error: `No case ${payload.caseId} found in this registry` };
  }
  const specimens = state.specimensByCase[c.id] ?? [];
  const events = state.eventsByCase[c.id] ?? [];
  const sealEvent = events.find((e) => e.action === "STEP_SEALED");

  const { sig, ...rest } = payload;
  const sigValid = await verifySignature(rest, sig);
  const sealMatches = payload.sealNo === c.sealNo;
  const countMatches = payload.specimenIds.length === specimens.length;
  const chainContinuous = Boolean(sealEvent && payload.chainHash === sealEvent.prevHash);
  const now = Date.now();
  const codeValid =
    Boolean(c.transferCode) &&
    c.transferCode === input.transferCode &&
    !c.transferCodeUsed &&
    Boolean(c.transferCodeExpiresAt) &&
    new Date(c.transferCodeExpiresAt!).getTime() > now;

  const steps: VerificationStep[] = [
    { key: "sig", label: "Signature valid", passed: sigValid },
    { key: "seal", label: "Seal number matches", passed: sealMatches, detail: `${payload.sealNo} vs case record ${c.sealNo ?? "—"}` },
    {
      key: "count",
      label: `Specimen count ${payload.specimenIds.length}/${specimens.length}`,
      passed: countMatches,
    },
    { key: "chain", label: "Chain hash continuous", passed: chainContinuous },
    { key: "code", label: "Transfer code valid", passed: codeValid },
  ];

  return {
    ok: steps.every((s) => s.passed),
    steps,
    caseId: c.id,
    parsedPayload: payload,
  };
}

// ---------------------------------------------------------------------------
// Police actions
// ---------------------------------------------------------------------------

export async function acceptCustody(
  caseId: string,
  input: {
    sealCondition: "Intact" | "Damaged" | "Tampered";
    sealNoObserved: string;
    specimenCountConfirmed: number;
    transferCodeValid: boolean;
    remarks?: string;
  }
): Promise<{ accepted: boolean }> {
  const c = state.cases.find((x) => x.id === caseId);
  if (!c) throw new Error("Case not found");

  const accepted = input.sealCondition === "Intact" && input.transferCodeValid;
  const action = accepted ? "CUSTODY_ACCEPTED" : "CUSTODY_DECLINED";

  if (accepted) {
    updateCase(caseId, {
      status: "IN_POLICE_CUSTODY",
      currentStage: "POLICE",
      custodianName: state.currentUser?.name ?? c.custodianName,
      custodianOrg: state.currentUser?.org ?? c.custodianOrg,
      stageEnteredAt: new Date().toISOString(),
      transferCodeUsed: true,
    });
  } else {
    updateCase(caseId, { status: "INTEGRITY_COMPROMISED", transferCodeUsed: true });
  }

  await recordEvent({ caseId, actorRole: "POLICE", action, payload: { ...input } });
  return { accepted };
}

export async function initiateTransferToFSL(
  caseId: string,
  input: { receivingLab: string; receivingOfficer: string }
): Promise<{ transferCode: string; expiresAt: string }> {
  const transferCode = genDigits(6);
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  updateCase(caseId, {
    status: "IN_TRANSIT_TO_FSL",
    transferCode,
    transferCodeExpiresAt: expiresAt,
    transferCodeUsed: false,
    receivingOfficer: input.receivingOfficer,
    receivingStation: input.receivingLab,
  });
  await recordEvent({
    caseId,
    actorRole: "POLICE",
    action: "TRANSFER_TO_FSL_INITIATED",
    payload: { ...input, transferCode },
  });
  return { transferCode, expiresAt };
}

// ---------------------------------------------------------------------------
// FSL actions
// ---------------------------------------------------------------------------

export async function fslAcceptCustody(
  caseId: string,
  input: {
    sealCondition: "Intact" | "Damaged" | "Tampered";
    sealNoObserved: string;
    specimenCountConfirmed: number;
    transferCodeValid: boolean;
    remarks?: string;
  }
): Promise<{ accepted: boolean }> {
  const c = state.cases.find((x) => x.id === caseId);
  if (!c) throw new Error("Case not found");

  const accepted = input.sealCondition === "Intact" && input.transferCodeValid;
  const action = accepted ? "FSL_RECEIPT_ACCEPTED" : "FSL_RECEIPT_DECLINED";

  if (accepted) {
    updateCase(caseId, {
      status: "COMPLETED",
      currentStage: "FSL",
      custodianName: state.currentUser?.name ?? c.custodianName,
      custodianOrg: state.currentUser?.org ?? c.custodianOrg,
      stageEnteredAt: new Date().toISOString(),
      transferCodeUsed: true,
    });
  } else {
    updateCase(caseId, { status: "INTEGRITY_COMPROMISED", transferCodeUsed: true });
  }

  await recordEvent({ caseId, actorRole: "FSL", action, payload: { ...input } });
  return { accepted };
}

export async function runChainVerify(caseId: string): Promise<ChainVerifyResult> {
  const events = state.eventsByCase[caseId] ?? [];
  const result = await verifyChain(events);
  const c = state.cases.find((x) => x.id === caseId);
  if (c && !result.valid && c.status !== "INTEGRITY_COMPROMISED") {
    updateCase(caseId, { status: "INTEGRITY_COMPROMISED" });
  }
  await recordEvent({
    caseId,
    actorRole: "FSL",
    action: "CHAIN_VERIFIED",
    payload: { valid: result.valid, brokenAt: result.brokenAt ?? null, checked: result.checked },
  });
  recomputeAnomaliesForCase(caseId);
  return result;
}

export function applyTamperDemo(caseId: string, eventIndex: number) {
  const events = state.eventsByCase[caseId] ?? [];
  const next = tamperEventForDemo(events, eventIndex);
  setState({
    eventsByCase: { ...state.eventsByCase, [caseId]: next },
    allEvents: state.allEvents.map((e) => {
      const replacement = next.find((n) => n.id === e.id && n.caseId === caseId);
      return replacement ?? e;
    }),
  });
}

export const STATUS_LABELS = CASE_STATUS_LABELS;
export type { CustodyStage };
