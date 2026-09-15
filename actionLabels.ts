export const ACTION_LABELS: Record<string, string> = {
  CASE_CREATED: "Case created",
  SPECIMEN_ADDED: "Specimen added",
  STEP_CONSENT_RECORDED: "Consent recorded",
  STEP_KIT_OPENED: "Kit opened",
  STEP_SPECIMENS_COLLECTED: "Specimens collected",
  STEP_SPECIMENS_LABELLED: "Specimens labelled",
  STEP_PACKED: "Packed",
  STEP_SEALED: "Sealed",
  HANDOVER_INITIATED: "Handover initiated",
  CUSTODY_ACCEPTED: "Custody accepted",
  CUSTODY_DECLINED: "Custody declined",
  TRANSFER_TO_FSL_INITIATED: "Transfer to FSL initiated",
  FSL_RECEIPT_ACCEPTED: "FSL receipt accepted",
  FSL_RECEIPT_DECLINED: "FSL receipt declined",
  CHAIN_VERIFIED: "Chain verified",
  TAMPER_DEMO_APPLIED: "Tamper (dev demo)",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll("_", " ").toLowerCase();
}
