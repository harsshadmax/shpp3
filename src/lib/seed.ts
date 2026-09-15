import { appendEvent, signPayload } from "./chain";
import type {
  CaseRecord,
  CaseStatus,
  CustodyEvent,
  CustodyStage,
  Specimen,
  SpecimenLabel,
} from "./types";

const HOSPITAL = "Govt. Hospital, Chennai";
const MO_NAME = "Dr. Meera Ravikumar";
const MO_ID = "u-mo-1";
const MO_DEVICE = "device-mo-tablet-01";

const POLICE_STATION = "Guindy Police Station";
const POLICE_NAME = "SI R. Rajan";
const POLICE_ID = "u-police-1";
const POLICE_DEVICE = "device-police-terminal-04";

const FSL_ORG = "Regional FSL Chennai";
const FSL_NAME = "Dr. A. Krishnan";
const FSL_ID = "u-fsl-1";
const FSL_DEVICE = "device-fsl-workstation-01";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

interface CaseSeedSpec {
  id: string;
  mlcNumber: string;
  ageBand: string;
  kitSerial: string;
  sealNo: string;
  transferCode: string;
  specimens: { label: SpecimenLabel; container: string }[];
  /** Hours-ago timestamp for the case-created event; later steps step forward from here. */
  createdHoursAgo: number;
  /** How far through the MO stepper this case has progressed (0 = nothing done, 7 = handover initiated). */
  moStepsCompleted: number;
  policeOutcome?: "accepted" | "accepted-mismatch";
  policeAcceptHoursAgo?: number;
  transferToFslHoursAgo?: number;
  fslAcceptHoursAgo?: number;
  finalStatus: CaseStatus;
  finalStage: CustodyStage;
}

const CASE_SPECS: CaseSeedSpec[] = [
  {
    id: "SAEC-2026-0141",
    mlcNumber: "MLC/2026/0141",
    ageBand: "18–25",
    kitSerial: "KIT-VMK-1041",
    sealNo: "SEAL-84101",
    transferCode: "482910",
    specimens: [
      { label: "Vaginal swab", container: "Swab transport tube" },
      { label: "Nail clippings", container: "Sterile paper bag" },
    ],
    createdHoursAgo: 3,
    moStepsCompleted: 5,
    finalStatus: "EXAMINATION_IN_PROGRESS",
    finalStage: "MO",
  },
  {
    id: "SAEC-2026-0147",
    mlcNumber: "MLC/2026/0147",
    ageBand: "26–35",
    kitSerial: "KIT-VMK-1047",
    sealNo: "SEAL-84107",
    transferCode: "119284",
    specimens: [],
    createdHoursAgo: 0.3,
    moStepsCompleted: 0,
    finalStatus: "EXAMINATION_IN_PROGRESS",
    finalStage: "MO",
  },
  {
    id: "SAEC-2026-0142",
    mlcNumber: "MLC/2026/0142",
    ageBand: "36–45",
    kitSerial: "KIT-VMK-1042",
    sealNo: "SEAL-84102",
    transferCode: "603157",
    specimens: [
      { label: "Vaginal swab", container: "Swab transport tube" },
      { label: "Blood (EDTA)", container: "EDTA vacutainer" },
      { label: "Control swab", container: "Swab transport tube" },
    ],
    createdHoursAgo: 9,
    moStepsCompleted: 7,
    finalStatus: "SEALED_AWAITING_RECEIPT",
    finalStage: "MO",
  },
  {
    id: "SAEC-2026-0143",
    mlcNumber: "MLC/2026/0143",
    ageBand: "18–25",
    kitSerial: "KIT-VMK-1043",
    sealNo: "SEAL-84103",
    transferCode: "774028",
    specimens: [
      { label: "Vaginal swab", container: "Swab transport tube" },
      { label: "Clothing — inner", container: "Sterile paper bag" },
      { label: "Control swab", container: "Swab transport tube" },
    ],
    createdHoursAgo: 8,
    moStepsCompleted: 7,
    policeOutcome: "accepted",
    policeAcceptHoursAgo: 3,
    finalStatus: "IN_POLICE_CUSTODY",
    finalStage: "POLICE",
  },
  {
    id: "SAEC-2026-0144",
    mlcNumber: "MLC/2026/0144",
    ageBand: "26–35",
    kitSerial: "KIT-VMK-1044",
    sealNo: "SEAL-84104",
    transferCode: "295601",
    specimens: [
      { label: "Vaginal swab", container: "Swab transport tube" },
      { label: "Oral swab", container: "Swab transport tube" },
      { label: "Nail clippings", container: "Sterile paper bag" },
      { label: "Control swab", container: "Swab transport tube" },
    ],
    createdHoursAgo: 46,
    moStepsCompleted: 7,
    policeOutcome: "accepted",
    policeAcceptHoursAgo: 40,
    finalStatus: "IN_POLICE_CUSTODY",
    finalStage: "POLICE",
  },
  {
    id: "SAEC-2026-0145",
    mlcNumber: "MLC/2026/0145",
    ageBand: "18–25",
    kitSerial: "KIT-VMK-1045",
    sealNo: "SEAL-84105",
    transferCode: "836442",
    specimens: [
      { label: "Vaginal swab", container: "Swab transport tube" },
      { label: "Clothing — outer", container: "Sterile paper bag" },
      { label: "Control swab", container: "Swab transport tube" },
    ],
    createdHoursAgo: 20,
    moStepsCompleted: 7,
    policeOutcome: "accepted",
    policeAcceptHoursAgo: 16,
    transferToFslHoursAgo: 2,
    finalStatus: "IN_TRANSIT_TO_FSL",
    finalStage: "POLICE",
  },
  {
    id: "SAEC-2026-0146",
    mlcNumber: "MLC/2026/0146",
    ageBand: "36–45",
    kitSerial: "KIT-VMK-1046",
    sealNo: "SEAL-84106",
    transferCode: "550193",
    specimens: [
      { label: "Vaginal swab", container: "Swab transport tube" },
      { label: "Nail clippings", container: "Sterile paper bag" },
      { label: "Blood (EDTA)", container: "EDTA vacutainer" },
      { label: "Control swab", container: "Swab transport tube" },
    ],
    createdHoursAgo: 72,
    moStepsCompleted: 7,
    policeOutcome: "accepted",
    policeAcceptHoursAgo: 66,
    transferToFslHoursAgo: 20,
    fslAcceptHoursAgo: 6,
    finalStatus: "COMPLETED",
    finalStage: "FSL",
  },
  {
    id: "SAEC-2026-0148",
    mlcNumber: "MLC/2026/0148",
    ageBand: "26–35",
    kitSerial: "KIT-VMK-1048",
    sealNo: "SEAL-84108",
    transferCode: "367215",
    specimens: [
      { label: "Vaginal swab", container: "Swab transport tube" },
      { label: "Anal swab", container: "Swab transport tube" },
      { label: "Nail clippings", container: "Sterile paper bag" },
      { label: "Control swab", container: "Swab transport tube" },
    ],
    createdHoursAgo: 14,
    moStepsCompleted: 7,
    policeOutcome: "accepted-mismatch",
    policeAcceptHoursAgo: 10,
    finalStatus: "INTEGRITY_COMPROMISED",
    finalStage: "POLICE",
  },
];

export interface SeedResult {
  cases: CaseRecord[];
  specimensByCase: Record<string, Specimen[]>;
  eventsByCase: Record<string, CustodyEvent[]>;
  allEvents: CustodyEvent[];
}

export async function buildSeedData(): Promise<SeedResult> {
  const cases: CaseRecord[] = [];
  const specimensByCase: Record<string, Specimen[]> = {};
  const eventsByCase: Record<string, CustodyEvent[]> = {};
  const allEvents: CustodyEvent[] = [];

  for (const spec of CASE_SPECS) {
    const events: CustodyEvent[] = [];
    const specimens: Specimen[] = spec.specimens.map((s, i) => ({
      id: `${spec.id}-S${String(i + 1).padStart(2, "0")}`,
      caseId: spec.id,
      label: s.label,
      container: s.container,
      collectedAt: hoursAgo(spec.createdHoursAgo - 0.15 * (i + 1)),
    }));
    specimensByCase[spec.id] = specimens;

    const t = (offsetFromCreatedHrs: number) => hoursAgo(spec.createdHoursAgo - offsetFromCreatedHrs);

    const push = async (
      actorId: string,
      actorRole: CustodyEvent["actorRole"],
      actorName: string,
      action: string,
      payload: Record<string, unknown>,
      deviceId: string,
      geoLabel: string,
      timestamp: string
    ) => {
      const evt = await appendEvent(events, {
        caseId: spec.id,
        actorId,
        actorRole,
        actorName,
        action,
        payload,
        deviceId,
        geoLabel,
        timestamp,
      });
      events.push(evt);
    };

    await push(
      MO_ID,
      "MO",
      MO_NAME,
      "CASE_CREATED",
      {
        hospital: HOSPITAL,
        mlcNumber: spec.mlcNumber,
        policeStation: POLICE_STATION,
        examiningOfficer: MO_NAME,
        ageBand: spec.ageBand,
        sex: "F",
      },
      MO_DEVICE,
      HOSPITAL,
      t(0)
    );

    const step = spec.moStepsCompleted;
    if (step >= 1) {
      await push(MO_ID, "MO", MO_NAME, "STEP_CONSENT_RECORDED", {}, MO_DEVICE, HOSPITAL, t(0.1));
    }
    if (step >= 2) {
      await push(
        MO_ID,
        "MO",
        MO_NAME,
        "STEP_KIT_OPENED",
        { kitSerial: spec.kitSerial },
        MO_DEVICE,
        HOSPITAL,
        t(0.3)
      );
    }
    if (step >= 3) {
      for (const s of specimens) {
        await push(
          MO_ID,
          "MO",
          MO_NAME,
          "SPECIMEN_ADDED",
          { specimenId: s.id, label: s.label, container: s.container },
          MO_DEVICE,
          HOSPITAL,
          t(0.4)
        );
      }
      await push(MO_ID, "MO", MO_NAME, "STEP_SPECIMENS_COLLECTED", {}, MO_DEVICE, HOSPITAL, t(0.5));
    }
    if (step >= 4) {
      await push(MO_ID, "MO", MO_NAME, "STEP_SPECIMENS_LABELLED", {}, MO_DEVICE, HOSPITAL, t(0.7));
    }
    if (step >= 5) {
      await push(MO_ID, "MO", MO_NAME, "STEP_PACKED", {}, MO_DEVICE, HOSPITAL, t(0.9));
    }
    let chainHashAtSeal = events.length > 0 ? events[events.length - 1].hash : "0".repeat(64);
    if (step >= 6) {
      chainHashAtSeal = events[events.length - 1].hash;
      const sealPayload = {
        caseId: spec.id,
        specimenIds: specimens.map((s) => s.id),
        sealNo: spec.sealNo,
        sealedAt: t(1.1),
        chainHash: chainHashAtSeal,
      };
      const sig = await signPayload(sealPayload);
      await push(
        MO_ID,
        "MO",
        MO_NAME,
        "STEP_SEALED",
        { ...sealPayload, sig },
        MO_DEVICE,
        HOSPITAL,
        t(1.1)
      );
    }
    if (step >= 7) {
      await push(
        MO_ID,
        "MO",
        MO_NAME,
        "HANDOVER_INITIATED",
        {
          receivingStation: POLICE_STATION,
          receivingOfficer: POLICE_NAME,
          transferCode: spec.transferCode,
        },
        MO_DEVICE,
        HOSPITAL,
        t(1.3)
      );
    }

    if (spec.policeOutcome && spec.policeAcceptHoursAgo !== undefined) {
      const observedSeal = spec.policeOutcome === "accepted-mismatch" ? `${spec.sealNo}X` : spec.sealNo;
      const confirmedCount =
        spec.policeOutcome === "accepted-mismatch" ? Math.max(specimens.length - 1, 0) : specimens.length;
      await push(
        POLICE_ID,
        "POLICE",
        POLICE_NAME,
        "CUSTODY_ACCEPTED",
        {
          sealCondition: "Intact",
          sealNoObserved: observedSeal,
          specimenCountConfirmed: confirmedCount,
          transferCodeValid: true,
          remarks: "",
        },
        POLICE_DEVICE,
        POLICE_STATION,
        hoursAgo(spec.policeAcceptHoursAgo)
      );
    }

    if (spec.transferToFslHoursAgo !== undefined) {
      await push(
        POLICE_ID,
        "POLICE",
        POLICE_NAME,
        "TRANSFER_TO_FSL_INITIATED",
        { receivingLab: FSL_ORG, receivingOfficer: FSL_NAME, transferCode: `${spec.transferCode}F` },
        POLICE_DEVICE,
        POLICE_STATION,
        hoursAgo(spec.transferToFslHoursAgo + 0.2)
      );
    }

    if (spec.fslAcceptHoursAgo !== undefined) {
      await push(
        FSL_ID,
        "FSL",
        FSL_NAME,
        "FSL_RECEIPT_ACCEPTED",
        {
          sealCondition: "Intact",
          sealNoObserved: spec.sealNo,
          specimenCountConfirmed: specimens.length,
          transferCodeValid: true,
          remarks: "",
        },
        FSL_DEVICE,
        FSL_ORG,
        hoursAgo(spec.fslAcceptHoursAgo)
      );
    }

    eventsByCase[spec.id] = events;
    allEvents.push(...events);

    const lastEvent = events[events.length - 1];
    cases.push({
      id: spec.id,
      hospital: HOSPITAL,
      mlcNumber: spec.mlcNumber,
      policeStation: POLICE_STATION,
      examiningOfficer: MO_NAME,
      ageBand: spec.ageBand,
      sex: "F",
      status: spec.finalStatus,
      stepIndex: step,
      createdAt: hoursAgo(spec.createdHoursAgo),
      kitSerial: step >= 2 ? spec.kitSerial : undefined,
      sealNo: step >= 6 ? spec.sealNo : undefined,
      sealedAt: step >= 6 ? t(1.1) : undefined,
      transferCode: step >= 7 ? spec.transferCode : undefined,
      transferCodeExpiresAt: step >= 7 ? new Date(new Date(t(1.3)).getTime() + 30 * 60_000).toISOString() : undefined,
      transferCodeUsed: Boolean(spec.policeOutcome),
      receivingOfficer: step >= 7 ? POLICE_NAME : undefined,
      receivingStation: step >= 7 ? POLICE_STATION : undefined,
      currentStage: spec.finalStage,
      custodianName:
        spec.finalStage === "MO" ? MO_NAME : spec.finalStage === "POLICE" ? POLICE_NAME : FSL_NAME,
      custodianOrg:
        spec.finalStage === "MO" ? HOSPITAL : spec.finalStage === "POLICE" ? POLICE_STATION : FSL_ORG,
      stageEnteredAt: lastEvent?.timestamp ?? hoursAgo(spec.createdHoursAgo),
    });
  }

  allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return { cases, specimensByCase, eventsByCase, allEvents };
}
