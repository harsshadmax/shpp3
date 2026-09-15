"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { LayoutDashboard, FilePlus2, Check, Circle, Lock, Plus } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardBody, CardHeader, SectionLabel } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { QrCode } from "@/components/ui/QrCode";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import {
  useCase,
  useSpecimens,
  useEvents,
  addSpecimen,
  advanceStep,
} from "@/lib/store";
import {
  CASE_STATUS_LABELS,
  EXAM_STEPS,
  EXAM_STEP_LABELS,
  SPECIMEN_LABELS,
  type ExamStep,
  type SealPayload,
  type SpecimenLabel,
} from "@/lib/types";
import { statusTone, formatDateTime, shortHash } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/mo", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mo/cases/new", label: "New case", icon: FilePlus2 },
];

export default function MoCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = decodeURIComponent(params.caseId);
  return (
    <RoleShell navItems={NAV_ITEMS} title={caseId}>
      <CaseDetail caseId={caseId} />
    </RoleShell>
  );
}

function CaseDetail({ caseId }: { caseId: string }) {
  const c = useCase(caseId);
  const specimens = useSpecimens(caseId);
  const events = useEvents(caseId);

  if (!c) {
    return <p className="text-[13px] text-[var(--ink-faint)]">Case not found in this registry.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardBody className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono-id text-[18px] font-semibold">{c.id}</span>
              <StatusChip tone={statusTone(c.status)}>{CASE_STATUS_LABELS[c.status]}</StatusChip>
            </div>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-1 text-[13px]">
              <InfoField label="MLC number" value={c.mlcNumber} mono />
              <InfoField label="Hospital" value={c.hospital} />
              <InfoField label="Police station" value={c.policeStation} />
              <InfoField label="Age band / Sex" value={`${c.ageBand} · ${c.sex}`} />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6 items-start">
        <Card>
          <CardHeader>
            <SectionLabel>Examination workflow</SectionLabel>
          </CardHeader>
          <CardBody>
            <Stepper stepIndex={c.stepIndex} />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <StepActionPanel caseId={caseId} stepIndex={c.stepIndex} specimenCount={specimens.length} />

          <Card>
            <CardHeader className="flex items-center justify-between">
              <SectionLabel>Specimen register</SectionLabel>
              <span className="text-[12px] font-mono-id text-[var(--ink-faint)]">{specimens.length} logged</span>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              {c.stepIndex <= EXAM_STEPS.indexOf("SPECIMENS_LABELLED") && c.status === "EXAMINATION_IN_PROGRESS" && (
                <AddSpecimenForm caseId={caseId} />
              )}
              {specimens.length === 0 ? (
                <p className="text-[13px] text-[var(--ink-faint)]">No specimens logged yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {specimens.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between border border-[var(--border)] rounded-[6px] px-4 py-3"
                    >
                      <div>
                        <div className="font-mono-id text-[13px] font-medium">{s.id}</div>
                        <div className="text-[13px] text-[var(--ink-muted)]">
                          {s.label} · {s.container}
                        </div>
                      </div>
                      <QrCode value={JSON.stringify({ caseId: s.caseId, specimenId: s.id })} size={64} />
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {c.sealNo && <SealPanel sealNo={c.sealNo} events={events} />}

          {c.transferCode && (
            <Card>
              <CardHeader>
                <SectionLabel>Handover</SectionLabel>
              </CardHeader>
              <CardBody className="flex items-center gap-8">
                <div>
                  <div className="text-[11px] text-[var(--ink-muted)]">Transfer code</div>
                  <div className="font-mono-id text-[24px] font-semibold tracking-widest">{c.transferCode}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--ink-muted)]">Valid until</div>
                  <div className="font-mono-id text-[13px]">
                    {c.transferCodeExpiresAt ? formatDateTime(c.transferCodeExpiresAt) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--ink-muted)]">Receiving</div>
                  <div className="text-[13px]">
                    {c.receivingOfficer} · {c.receivingStation}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <SectionLabel>Custody events</SectionLabel>
            </CardHeader>
            <Table>
              <THead>
                <tr>
                  <Th>Timestamp</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Hash</Th>
                </tr>
              </THead>
              <tbody>
                {events.map((e) => (
                  <Tr key={e.id}>
                    <Td className="font-mono-id text-[12px] text-[var(--ink-muted)]">{formatDateTime(e.timestamp)}</Td>
                    <Td className="text-[13px]">{e.actorName}</Td>
                    <Td className="text-[13px]">{e.action.replaceAll("_", " ").toLowerCase()}</Td>
                    <Td className="font-mono-id text-[12px] text-[var(--ink-faint)]">{shortHash(e.hash)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--ink-faint)]">{label}</div>
      <div className={`text-[13px] ${mono ? "font-mono-id" : ""}`}>{value}</div>
    </div>
  );
}

function Stepper({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="flex flex-col">
      {EXAM_STEPS.map((step, i) => {
        const done = i < stepIndex;
        const current = i === stepIndex;
        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                  done
                    ? "bg-[var(--verified)] text-white"
                    : current
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface-sunken)] text-[var(--ink-faint)] border border-[var(--border-strong)]"
                }`}
              >
                {done ? <Check size={13} /> : current ? <Circle size={9} fill="white" /> : <Lock size={11} />}
              </div>
              {i < EXAM_STEPS.length - 1 && (
                <div className={`w-px flex-1 min-h-[24px] ${done ? "bg-[var(--verified)]" : "bg-[var(--border)]"}`} />
              )}
            </div>
            <div className="pb-6 pt-0.5">
              <div
                className={`text-[13px] ${
                  current ? "font-semibold text-[var(--ink)]" : done ? "text-[var(--ink)]" : "text-[var(--ink-faint)]"
                }`}
              >
                {EXAM_STEP_LABELS[step]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddSpecimenForm({ caseId }: { caseId: string }) {
  const [label, setLabel] = useState<SpecimenLabel>(SPECIMEN_LABELS[0]);
  const [container, setContainer] = useState("Sterile paper bag");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    await addSpecimen(caseId, { label, container });
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-3 pb-3 border-b border-[var(--border)]">
      <div className="flex-1">
        <FormField label="Specimen">
          <Select value={label} onChange={(e) => setLabel(e.target.value as SpecimenLabel)}>
            {SPECIMEN_LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="flex-1">
        <FormField label="Container">
          <Input value={container} onChange={(e) => setContainer(e.target.value)} />
        </FormField>
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="mb-0">
        <Plus size={14} /> Add
      </Button>
    </form>
  );
}

function StepActionPanel({
  caseId,
  stepIndex,
  specimenCount,
}: {
  caseId: string;
  stepIndex: number;
  specimenCount: number;
}) {
  if (stepIndex >= EXAM_STEPS.length) {
    return (
      <Card>
        <CardBody>
          <p className="text-[13px] text-[var(--verified)] font-medium">
            Handover initiated — case is now awaiting police receipt.
          </p>
        </CardBody>
      </Card>
    );
  }

  const step = EXAM_STEPS[stepIndex];

  return (
    <Card>
      <CardHeader>
        <SectionLabel>Current step — {EXAM_STEP_LABELS[step]}</SectionLabel>
      </CardHeader>
      <CardBody>
        {step === "CONSENT_RECORDED" && <SimpleStepAction caseId={caseId} step={step} label="Mark consent recorded" />}
        {step === "KIT_OPENED" && <KitOpenedAction caseId={caseId} />}
        {step === "SPECIMENS_COLLECTED" && (
          <SimpleStepAction
            caseId={caseId}
            step={step}
            label="Confirm specimens collected"
            disabled={specimenCount === 0}
            disabledHint="Log at least one specimen below before confirming."
          />
        )}
        {step === "SPECIMENS_LABELLED" && (
          <SimpleStepAction caseId={caseId} step={step} label="Confirm specimens labelled" />
        )}
        {step === "PACKED" && <SimpleStepAction caseId={caseId} step={step} label="Confirm packed" />}
        {step === "SEALED" && <SealAction caseId={caseId} />}
        {step === "HANDOVER_INITIATED" && <HandoverAction caseId={caseId} />}
      </CardBody>
    </Card>
  );
}

function SimpleStepAction({
  caseId,
  step,
  label,
  disabled,
  disabledHint,
}: {
  caseId: string;
  step: ExamStep;
  label: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [pending, setPending] = useState(false);
  async function run() {
    setPending(true);
    await advanceStep(caseId, step);
    setPending(false);
  }
  return (
    <div className="flex items-center gap-3">
      <Button onClick={run} disabled={pending || disabled}>
        {pending ? "Recording…" : label}
      </Button>
      {disabled && disabledHint && <span className="text-[12px] text-[var(--ink-faint)]">{disabledHint}</span>}
    </div>
  );
}

function KitOpenedAction({ caseId }: { caseId: string }) {
  const [serial, setSerial] = useState("");
  const [pending, setPending] = useState(false);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!serial.trim()) return;
    setPending(true);
    await advanceStep(caseId, "KIT_OPENED", { kitSerial: serial.trim() });
    setPending(false);
  }
  return (
    <form onSubmit={run} className="flex items-end gap-3">
      <div className="flex-1 max-w-[260px]">
        <FormField label="Kit serial number">
          <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="KIT-VMK-1049" className="font-mono-id" required />
        </FormField>
      </div>
      <Button type="submit" disabled={pending} className="mb-0">
        {pending ? "Recording…" : "Log kit opened"}
      </Button>
    </form>
  );
}

function SealAction({ caseId }: { caseId: string }) {
  const [pending, setPending] = useState(false);
  async function run() {
    setPending(true);
    await advanceStep(caseId, "SEALED");
    setPending(false);
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-[var(--ink-muted)]">
        Generates a tamper-evident seal number and a signed QR payload over the current specimen set and chain
        state.
      </p>
      <div>
        <Button onClick={run} disabled={pending}>
          {pending ? "Sealing…" : "Generate seal & QR"}
        </Button>
      </div>
    </div>
  );
}

function HandoverAction({ caseId }: { caseId: string }) {
  const [receivingStation, setReceivingStation] = useState("Guindy Police Station");
  const [receivingOfficer, setReceivingOfficer] = useState("SI R. Rajan");
  const [pending, setPending] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    await advanceStep(caseId, "HANDOVER_INITIATED", { receivingStation, receivingOfficer });
    setPending(false);
  }

  return (
    <form onSubmit={run} className="flex items-end gap-3">
      <div className="flex-1">
        <FormField label="Receiving station">
          <Input value={receivingStation} onChange={(e) => setReceivingStation(e.target.value)} required />
        </FormField>
      </div>
      <div className="flex-1">
        <FormField label="Receiving officer">
          <Input value={receivingOfficer} onChange={(e) => setReceivingOfficer(e.target.value)} required />
        </FormField>
      </div>
      <Button type="submit" disabled={pending} className="mb-0">
        {pending ? "Generating…" : "Initiate handover"}
      </Button>
    </form>
  );
}

function SealPanel({
  sealNo,
  events,
}: {
  sealNo: string;
  events: ReturnType<typeof useEvents>;
}) {
  const sealEvent = events.find((e) => e.action === "STEP_SEALED");
  if (!sealEvent) return null;
  const payload = sealEvent.payload as unknown as SealPayload;
  return (
    <Card>
      <CardHeader>
        <SectionLabel>Seal & QR — {sealNo}</SectionLabel>
      </CardHeader>
      <CardBody className="flex gap-6">
        <QrCode value={JSON.stringify(payload)} size={200} />
        <div className="flex-1 min-w-0">
          <pre className="font-mono-id text-[11px] leading-5 whitespace-pre-wrap break-all bg-[var(--surface-sunken)] rounded-[6px] p-3 border border-[var(--border)]">
{JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      </CardBody>
    </Card>
  );
}
