export type Role = "MO" | "POLICE" | "FSL";

export interface UserAccount {
  id: string;
  email: string;
  password: string;
  role: Role;
  name: string;
  org: string;
}

export interface SessionUser {
  userId: string;
  role: Role;
  name: string;
  org: string;
}

export const SPECIMEN_LABELS = [
  "Vaginal swab",
  "Oral swab",
  "Anal swab",
  "Nail clippings",
  "Clothing — inner",
  "Clothing — outer",
  "Blood (EDTA)",
  "Blood (Plain)",
  "Control swab",
  "Debris / foreign material",
] as const;

export type SpecimenLabel = (typeof SPECIMEN_LABELS)[number];

export interface Specimen {
  id: string;
  caseId: string;
  label: SpecimenLabel;
  container: string;
  collectedAt: string;
}

export const EXAM_STEPS = [
  "CONSENT_RECORDED",
  "KIT_OPENED",
  "SPECIMENS_COLLECTED",
  "SPECIMENS_LABELLED",
  "PACKED",
  "SEALED",
  "HANDOVER_INITIATED",
] as const;

export type ExamStep = (typeof EXAM_STEPS)[number];

export const EXAM_STEP_LABELS: Record<ExamStep, string> = {
  CONSENT_RECORDED: "Consent recorded",
  KIT_OPENED: "Kit opened & kit serial logged",
  SPECIMENS_COLLECTED: "Specimens collected",
  SPECIMENS_LABELLED: "Specimens labelled",
  PACKED: "Packed",
  SEALED: "Sealed",
  HANDOVER_INITIATED: "Handover initiated",
};

export type CaseStatus =
  | "EXAMINATION_IN_PROGRESS"
  | "SEALED_AWAITING_RECEIPT"
  | "IN_POLICE_CUSTODY"
  | "IN_TRANSIT_TO_FSL"
  | "AT_FSL"
  | "COMPLETED"
  | "INTEGRITY_COMPROMISED";

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  EXAMINATION_IN_PROGRESS: "Examination in progress",
  SEALED_AWAITING_RECEIPT: "Sealed — awaiting receipt",
  IN_POLICE_CUSTODY: "In police custody",
  IN_TRANSIT_TO_FSL: "In transit to FSL",
  AT_FSL: "At FSL",
  COMPLETED: "Completed",
  INTEGRITY_COMPROMISED: "Integrity compromised",
};

export type CustodyStage = "MO" | "POLICE" | "FSL";

export interface SealCondition {
  condition: "Intact" | "Damaged" | "Tampered";
  remarks?: string;
}

export interface CaseRecord {
  id: string;
  hospital: string;
  mlcNumber: string;
  policeStation: string;
  examiningOfficer: string;
  ageBand: string;
  sex: "F" | "M" | "X";
  status: CaseStatus;
  stepIndex: number;
  createdAt: string;
  kitSerial?: string;
  sealNo?: string;
  sealedAt?: string;
  transferCode?: string;
  transferCodeExpiresAt?: string;
  transferCodeUsed?: boolean;
  receivingOfficer?: string;
  receivingStation?: string;
  currentStage: CustodyStage;
  custodianName: string;
  custodianOrg: string;
  stageEnteredAt: string;
}

export interface CustodyEvent {
  id: string;
  caseId: string;
  actorId: string;
  actorRole: Role;
  actorName: string;
  action: string;
  payload: Record<string, unknown>;
  deviceId: string;
  geoLabel: string;
  timestamp: string;
  prevHash: string;
  hash: string;
  queued?: boolean;
  syncedAt?: string;
}

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Anomaly {
  id: string;
  caseId: string;
  rule: string;
  severity: AnomalySeverity;
  message: string;
  eventId?: string;
  detectedAt: string;
}

export interface SealPayload {
  caseId: string;
  specimenIds: string[];
  sealNo: string;
  sealedAt: string;
  chainHash: string;
  sig: string;
}
