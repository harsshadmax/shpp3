import type { Role } from "./types";

/**
 * The set of custody-event action types each role is permitted to write.
 * Shared by the client (to know what it may submit) and by
 * /api/custody/append (to re-check role server-side before acknowledging).
 */
export const ROLE_ACTIONS: Record<Role, string[]> = {
  MO: [
    "CASE_CREATED",
    "SPECIMEN_ADDED",
    "STEP_CONSENT_RECORDED",
    "STEP_KIT_OPENED",
    "STEP_SPECIMENS_COLLECTED",
    "STEP_SPECIMENS_LABELLED",
    "STEP_PACKED",
    "STEP_SEALED",
    "HANDOVER_INITIATED",
  ],
  POLICE: ["CUSTODY_ACCEPTED", "CUSTODY_DECLINED", "TRANSFER_TO_FSL_INITIATED"],
  FSL: ["FSL_RECEIPT_ACCEPTED", "FSL_RECEIPT_DECLINED", "CHAIN_VERIFIED", "TAMPER_DEMO_APPLIED"],
};

export function isActionAllowedForRole(role: Role, action: string): boolean {
  return ROLE_ACTIONS[role]?.includes(action) ?? false;
}
