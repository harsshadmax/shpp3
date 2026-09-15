"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { LayoutDashboard, ScanLine, ListChecks } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardBody, CardHeader, SectionLabel } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { useCase, useEvents, useSpecimens, useCaseAnomalies, initiateTransferToFSL } from "@/lib/store";
import { CASE_STATUS_LABELS } from "@/lib/types";
import { statusTone, formatDateTime, shortHash } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/police", label: "Dashboard", icon: LayoutDashboard },
  { href: "/police/receive", label: "Receive evidence", icon: ScanLine },
  { href: "/police/custody-register", label: "Custody register", icon: ListChecks },
];

export default function PoliceCaseDetailPage() {
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

  if (!c) return <p className="text-[13px] text-[var(--ink-faint)]">Case not found in this registry.</p>;

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
            <Info label="Seal number" value={c.sealNo ?? "—"} mono />
            <Info label="Specimens" value={String(specimens.length)} />
            <Info label="In custody since" value={formatDateTime(c.stageEnteredAt)} />
          </div>
        </CardBody>
      </Card>

      {anomalies.length > 0 && (
        <Card className="border-[var(--breach)]">
          <CardHeader>
            <SectionLabel className="text-[var(--breach)]">Anomalies on this case</SectionLabel>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {anomalies.map((a) => (
              <div key={a.id} className="text-[13px] flex items-center gap-2">
                <StatusChip tone="breach">{a.severity}</StatusChip>
                <span>{a.message}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {c.status === "IN_POLICE_CUSTODY" && <TransferPanel caseId={caseId} />}

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
                <Td className="text-[13px]">
                  {e.actorName} · {e.actorRole}
                </Td>
                <Td className="text-[13px]">{e.action.replaceAll("_", " ").toLowerCase()}</Td>
                <Td className="font-mono-id text-[12px] text-[var(--ink-faint)]">{shortHash(e.hash)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
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

function TransferPanel({ caseId }: { caseId: string }) {
  const [receivingLab, setReceivingLab] = useState("Regional FSL Chennai");
  const [receivingOfficer, setReceivingOfficer] = useState("Dr. A. Krishnan");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ transferCode: string; expiresAt: string } | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const r = await initiateTransferToFSL(caseId, { receivingLab, receivingOfficer });
    setResult(r);
    setPending(false);
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <SectionLabel>Transfer to FSL initiated</SectionLabel>
        </CardHeader>
        <CardBody className="flex items-center gap-8">
          <div>
            <div className="text-[11px] text-[var(--ink-muted)]">Transfer code</div>
            <div className="font-mono-id text-[24px] font-semibold tracking-widest">{result.transferCode}</div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--ink-muted)]">Valid until</div>
            <div className="font-mono-id text-[13px]">{formatDateTime(result.expiresAt)}</div>
          </div>
          <p className="text-[12px] text-[var(--ink-faint)] max-w-[260px]">
            Present this code and the original seal QR to FSL on receipt.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <SectionLabel>Transfer to FSL</SectionLabel>
      </CardHeader>
      <CardBody>
        <form onSubmit={run} className="flex items-end gap-3">
          <div className="flex-1">
            <FormField label="Receiving lab">
              <Input value={receivingLab} onChange={(e) => setReceivingLab(e.target.value)} required />
            </FormField>
          </div>
          <div className="flex-1">
            <FormField label="Receiving officer">
              <Input value={receivingOfficer} onChange={(e) => setReceivingOfficer(e.target.value)} required />
            </FormField>
          </div>
          <Button type="submit" disabled={pending} className="mb-0">
            {pending ? "Generating…" : "Initiate transfer"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
