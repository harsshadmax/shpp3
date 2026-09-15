"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { LayoutDashboard, TriangleAlert, ScrollText, ShieldCheck, FlaskConical } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardBody, CardHeader, SectionLabel } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { SweepBar } from "@/components/ui/SweepBar";
import { CustodyTimeline } from "@/components/fsl/CustodyTimeline";
import {
  useCase,
  useEvents,
  useSpecimens,
  useCaseAnomalies,
  runChainVerify,
  applyTamperDemo,
  fslAcceptCustody,
} from "@/lib/store";
import { CASE_STATUS_LABELS } from "@/lib/types";
import { statusTone, formatDateTime } from "@/lib/format";
import { actionLabel } from "@/lib/actionLabels";
import type { ChainVerifyResult } from "@/lib/chain";

const NAV_ITEMS = [
  { href: "/fsl", label: "Tracking board", icon: LayoutDashboard },
  { href: "/fsl/anomalies", label: "Anomalies", icon: TriangleAlert },
  { href: "/fsl/audit-log", label: "Audit log", icon: ScrollText },
];

export default function FslCaseDetailPage() {
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
  const events = useEvents(caseId);
  const specimens = useSpecimens(caseId);
  const anomalies = useCaseAnomalies(caseId);

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<ChainVerifyResult | null>(null);

  if (!c) return <p className="text-[13px] text-[var(--ink-faint)]">Case not found in this registry.</p>;

  async function onVerify() {
    setVerifying(true);
    setVerifyResult(null);
    const r = await runChainVerify(caseId);
    setTimeout(() => {
      setVerifying(false);
      setVerifyResult(r);
    }, 420);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardBody>
          <div className="flex items-center gap-3">
            <span className="font-mono-id text-[18px] font-semibold">{c.id}</span>
            <StatusChip tone={statusTone(c.status)}>{CASE_STATUS_LABELS[c.status]}</StatusChip>
          </div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-1 text-[13px]">
            <Info label="Hospital" value={c.hospital} />
            <Info label="MLC number" value={c.mlcNumber} mono />
            <Info label="Specimens" value={String(specimens.length)} />
            <Info label="Events on chain" value={String(events.length)} />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6 items-start">
        <div className="flex flex-col gap-6">
          {anomalies.length > 0 && (
            <Card className="border-[var(--breach)]">
              <CardHeader>
                <SectionLabel className="text-[var(--breach)]">
                  Anomalies — {anomalies.length}
                </SectionLabel>
              </CardHeader>
              <CardBody className="flex flex-col gap-2">
                {anomalies.map((a) => (
                  <div key={a.id} className="text-[12px]">
                    <StatusChip tone="breach" className="mb-1">
                      {a.severity} · {a.rule.replaceAll("_", " ")}
                    </StatusChip>
                    <p className="text-[var(--ink-muted)]">{a.message}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {c.status === "IN_TRANSIT_TO_FSL" && <FslReceivePanel caseId={caseId} />}

          <Card>
            <CardHeader>
              <SectionLabel>Chain integrity verification</SectionLabel>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <Button onClick={onVerify} disabled={verifying} className="w-full">
                <ShieldCheck size={14} />
                {verifying ? "Verifying…" : "Verify chain"}
              </Button>
              {verifying && <SweepBar running={verifying} />}
              {!verifying && verifyResult && (
                <div
                  className={`rounded-[6px] border px-3 py-2.5 text-[13px] ${
                    verifyResult.valid
                      ? "border-[var(--verified)] bg-[var(--verified-bg)] text-[var(--verified)]"
                      : "border-[var(--breach)] bg-[var(--breach-bg)] text-[var(--breach)]"
                  }`}
                >
                  <div className="font-semibold font-mono-id">
                    {verifyResult.valid ? "INTACT" : "CHAIN BROKEN"}
                  </div>
                  <div className="mt-0.5 text-[12px]">
                    {verifyResult.valid
                      ? `${verifyResult.checked} events verified from genesis.`
                      : `Break detected at event ${verifyResult.brokenAt} (position ${verifyResult.brokenIndex! + 1} of ${events.length}).`}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <TamperDevControl caseId={caseId} events={events} />
        </div>

        <Card>
          <CardHeader>
            <SectionLabel>Custody timeline</SectionLabel>
          </CardHeader>
          <CardBody>
            <CustodyTimeline events={events} brokenEventId={verifyResult?.valid === false ? verifyResult.brokenAt : undefined} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--ink-faint)]">{label}</div>
      <div className={`text-[13px] ${mono ? "font-mono-id" : ""}`}>{value}</div>
    </div>
  );
}

function FslReceivePanel({ caseId }: { caseId: string }) {
  const [sealCondition, setSealCondition] = useState<"Intact" | "Damaged" | "Tampered">("Intact");
  const [specimenCountConfirmed, setSpecimenCountConfirmed] = useState(0);
  const [transferCode, setTransferCode] = useState("");
  const c = useCase(caseId);
  const specimens = useSpecimens(caseId);
  const [remarks, setRemarks] = useState("");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<"accepted" | "declined" | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const codeValid = Boolean(c?.transferCode) && transferCode === c?.transferCode;
    const { accepted } = await fslAcceptCustody(caseId, {
      sealCondition,
      sealNoObserved: c?.sealNo ?? "",
      specimenCountConfirmed,
      transferCodeValid: codeValid,
      remarks,
    });
    setPending(false);
    setOutcome(accepted ? "accepted" : "declined");
  }

  if (outcome) {
    return (
      <Card>
        <CardBody>
          <p className={`text-[13px] font-medium ${outcome === "accepted" ? "text-[var(--verified)]" : "text-[var(--breach)]"}`}>
            {outcome === "accepted" ? "Receipt accepted — case marked completed." : "Receipt declined — anomaly recorded."}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <SectionLabel>Receive & verify</SectionLabel>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <FormField label="Transfer code from police">
            <Input
              value={transferCode}
              onChange={(e) => setTransferCode(e.target.value)}
              className="font-mono-id"
              maxLength={6}
              required
            />
          </FormField>
          <FormField label="Seal condition">
            <Select value={sealCondition} onChange={(e) => setSealCondition(e.target.value as typeof sealCondition)}>
              <option value="Intact">Intact</option>
              <option value="Damaged">Damaged</option>
              <option value="Tampered">Tampered</option>
            </Select>
          </FormField>
          <FormField label="Specimen count confirmed">
            <Input
              type="number"
              min={0}
              value={specimenCountConfirmed}
              onChange={(e) => setSpecimenCountConfirmed(Number(e.target.value))}
              className="font-mono-id"
            />
            <p className="mt-1 text-[11px] text-[var(--ink-faint)]">Register shows {specimens.length}.</p>
          </FormField>
          <FormField label="Remarks (optional)">
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </FormField>
          <Button type="submit" disabled={pending}>
            <FlaskConical size={14} />
            {pending ? "Recording…" : "Accept receipt"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function TamperDevControl({ caseId, events }: { caseId: string; events: ReturnType<typeof useEvents> }) {
  const [index, setIndex] = useState(0);
  const [applied, setApplied] = useState(false);

  function apply() {
    applyTamperDemo(caseId, index);
    setApplied(true);
  }

  return (
    <Card className="border-dashed border-[var(--pending)]">
      <CardHeader>
        <SectionLabel className="text-[var(--pending)]">Development control — demo only</SectionLabel>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <p className="text-[12px] text-[var(--ink-faint)]">
          Mutates one historic event&apos;s payload without recomputing its hash, simulating an after-the-fact
          alteration. Run &quot;Verify chain&quot; afterwards to see it detected.
        </p>
        <FormField label="Event to tamper">
          <Select value={index} onChange={(e) => setIndex(Number(e.target.value))}>
            {events.map((e, i) => (
              <option key={e.id} value={i}>
                {i + 1}. {actionLabel(e.action)} — {formatDateTime(e.timestamp)}
              </option>
            ))}
          </Select>
        </FormField>
        <Button variant="destructive" onClick={apply} disabled={events.length === 0}>
          Apply tamper
        </Button>
        {applied && <p className="text-[12px] text-[var(--breach)]">Tamper applied. Run Verify chain to detect it.</p>}
      </CardBody>
    </Card>
  );
}
