import type { Anomaly, AnomalySeverity, CaseRecord, CustodyEvent, Specimen } from "./types";

function hoursBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 36e5;
}

function makeAnomaly(
  caseId: string,
  rule: string,
  severity: AnomalySeverity,
  message: string,
  eventId?: string
): Anomaly {
  return {
    id: `anomaly-${caseId}-${rule}-${eventId ?? "case"}`,
    caseId,
    rule,
    severity,
    message,
    eventId,
    detectedAt: new Date().toISOString(),
  };
}

function findEvent(events: CustodyEvent[], action: string): CustodyEvent | undefined {
  return events.find((e) => e.action === action);
}

export function detectAnomaliesForCase(
  caseRecord: CaseRecord,
  events: CustodyEvent[],
  specimens: Specimen[],
  chainValid: boolean,
  brokenEventId?: string
): Anomaly[] {
  const out: Anomaly[] = [];
  const caseId = caseRecord.id;

  if (!chainValid) {
    out.push(
      makeAnomaly(
        caseId,
        "HASH_DISCONTINUITY",
        "CRITICAL",
        `Recomputed hash does not match the recorded hash at event ${brokenEventId}. Chain integrity is broken from this point.`,
        brokenEventId
      )
    );
  }

  const sealed = findEvent(events, "STEP_SEALED");
  const custodyAccepted = findEvent(events, "CUSTODY_ACCEPTED");
  if (sealed && custodyAccepted) {
    const sealedNo = sealed.payload.sealNo as string | undefined;
    const observedNo = custodyAccepted.payload.sealNoObserved as string | undefined;
    if (sealedNo && observedNo && sealedNo !== observedNo) {
      out.push(
        makeAnomaly(
          caseId,
          "SEAL_NUMBER_MISMATCH",
          "HIGH",
          `Seal recorded at sealing (${sealedNo}) does not match seal observed at receipt (${observedNo}).`,
          custodyAccepted.id
        )
      );
    }
  }

  const handover = findEvent(events, "HANDOVER_INITIATED");
  if (handover) {
    const acceptedRef = custodyAccepted ?? findEvent(events, "CUSTODY_DECLINED");
    const endTime = acceptedRef?.timestamp ?? new Date().toISOString();
    const delay = hoursBetween(handover.timestamp, endTime);
    if (delay > 24) {
      out.push(
        makeAnomaly(
          caseId,
          "HANDOVER_DELAY",
          delay > 48 ? "HIGH" : "MEDIUM",
          `${delay.toFixed(1)}h elapsed between handover initiation and police receipt (threshold 24h).`,
          acceptedRef?.id ?? handover.id
        )
      );
    }
  }

  const transferFsl = findEvent(events, "TRANSFER_TO_FSL_INITIATED");
  const fslAccepted = findEvent(events, "FSL_RECEIPT_ACCEPTED");
  if (transferFsl) {
    const endTime = fslAccepted?.timestamp ?? new Date().toISOString();
    const delay = hoursBetween(transferFsl.timestamp, endTime);
    if (delay > 24) {
      out.push(
        makeAnomaly(
          caseId,
          "HANDOVER_DELAY",
          delay > 48 ? "HIGH" : "MEDIUM",
          `${delay.toFixed(1)}h elapsed between FSL transfer initiation and FSL receipt (threshold 24h).`,
          fslAccepted?.id ?? transferFsl.id
        )
      );
    }
  }

  if (custodyAccepted && !handover) {
    out.push(
      makeAnomaly(
        caseId,
        "OUT_OF_ORDER_TRANSITION",
        "HIGH",
        "Custody was accepted by police with no matching handover-initiated event in the chain.",
        custodyAccepted.id
      )
    );
  }
  if (fslAccepted && !transferFsl) {
    out.push(
      makeAnomaly(
        caseId,
        "OUT_OF_ORDER_TRANSITION",
        "HIGH",
        "FSL recorded receipt with no matching transfer-initiated event in the chain.",
        fslAccepted.id
      )
    );
  }

  for (const acceptEvt of [custodyAccepted, fslAccepted]) {
    if (!acceptEvt) continue;
    const confirmed = acceptEvt.payload.specimenCountConfirmed as number | undefined;
    if (typeof confirmed === "number" && confirmed !== specimens.length) {
      out.push(
        makeAnomaly(
          caseId,
          "SPECIMEN_COUNT_MISMATCH",
          "HIGH",
          `Specimen count confirmed at receipt (${confirmed}) does not match the register (${specimens.length}).`,
          acceptEvt.id
        )
      );
    }
    if (acceptEvt.payload.transferCodeValid === false) {
      out.push(
        makeAnomaly(
          caseId,
          "RECEIPT_WITHOUT_TRANSFER_CODE",
          "HIGH",
          "Custody was accepted without a valid transfer-code verification.",
          acceptEvt.id
        )
      );
    }
  }

  for (const e of events) {
    if (e.action === "CUSTODY_DECLINED" || e.action === "FSL_RECEIPT_DECLINED") {
      const condition = e.payload.sealCondition as string | undefined;
      out.push(
        makeAnomaly(
          caseId,
          "SEAL_CONDITION_COMPROMISED",
          "CRITICAL",
          `Receiving custodian declined custody — seal condition recorded as ${condition ?? "unknown"}.`,
          e.id
        )
      );
    }
  }

  for (const e of events) {
    if (e.queued && e.syncedAt) {
      const lateBy = hoursBetween(e.timestamp, e.syncedAt);
      if (lateBy > 12) {
        out.push(
          makeAnomaly(
            caseId,
            "OFFLINE_SYNC_LATE",
            "LOW",
            `Offline event synced ${lateBy.toFixed(1)}h after it was recorded (threshold 12h).`,
            e.id
          )
        );
      }
    }
  }

  return out;
}
