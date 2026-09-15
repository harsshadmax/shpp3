"use client";

import Link from "next/link";
import { LayoutDashboard, ScanLine, ListChecks } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardBody, CardHeader, SectionLabel } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { useCases, useCurrentUser } from "@/lib/store";
import { CASE_STATUS_LABELS } from "@/lib/types";
import { statusTone, formatDateTime, hoursSince } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/police", label: "Dashboard", icon: LayoutDashboard },
  { href: "/police/receive", label: "Receive evidence", icon: ScanLine },
  { href: "/police/custody-register", label: "Custody register", icon: ListChecks },
];

export default function PoliceDashboardPage() {
  return (
    <RoleShell
      navItems={NAV_ITEMS}
      title="Police IO dashboard"
      actions={
        <Link href="/police/receive">
          <Button>Receive evidence</Button>
        </Link>
      }
    >
      <DashboardContent />
    </RoleShell>
  );
}

function DashboardContent() {
  const cases = useCases();
  const user = useCurrentUser();

  const incoming = cases.filter((c) => c.status === "SEALED_AWAITING_RECEIPT");
  const inCustody = cases.filter((c) => c.currentStage === "POLICE" && c.status !== "SEALED_AWAITING_RECEIPT" && c.status !== "INTEGRITY_COMPROMISED");
  const specimenCount = inCustody.length; // one register per case in this prototype
  const overdue = inCustody.filter((c) => c.status === "IN_POLICE_CUSTODY" && hoursSince(c.stageEnteredAt) > 24);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Incoming handovers" value={incoming.length} />
        <StatCard label="Cases in my custody" value={specimenCount} />
        <StatCard label="Overdue for FSL deposit" value={overdue.length} tone={overdue.length > 0 ? "breach" : undefined} />
        <StatCard label="Signed in as" value={0} display={user?.name ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <SectionLabel>Incoming handovers</SectionLabel>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>Case ID</Th>
              <Th>Status</Th>
              <Th>Hospital</Th>
              <Th>Transfer code</Th>
              <Th>Sealed at</Th>
              <Th></Th>
            </tr>
          </THead>
          <tbody>
            {incoming.map((c) => (
              <Tr key={c.id}>
                <Td className="font-mono-id">{c.id}</Td>
                <Td>
                  <StatusChip tone={statusTone(c.status)}>{CASE_STATUS_LABELS[c.status]}</StatusChip>
                </Td>
                <Td className="text-[var(--ink-muted)]">{c.hospital}</Td>
                <Td className="font-mono-id">{c.transferCode}</Td>
                <Td className="text-[var(--ink-muted)]">{c.sealedAt ? formatDateTime(c.sealedAt) : "—"}</Td>
                <Td>
                  <Link href="/police/receive" className="text-[var(--accent)] text-[13px] font-medium">
                    Verify & accept →
                  </Link>
                </Td>
              </Tr>
            ))}
            {incoming.length === 0 && (
              <Tr>
                <Td colSpan={6} className="text-center text-[var(--ink-faint)]">
                  No handovers awaiting receipt.
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <SectionLabel>In my custody</SectionLabel>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>Case ID</Th>
              <Th>Status</Th>
              <Th>In custody since</Th>
              <Th></Th>
            </tr>
          </THead>
          <tbody>
            {inCustody.map((c) => (
              <Tr key={c.id}>
                <Td className="font-mono-id">{c.id}</Td>
                <Td>
                  <StatusChip tone={statusTone(c.status)}>{CASE_STATUS_LABELS[c.status]}</StatusChip>
                </Td>
                <Td className="text-[var(--ink-muted)]">{formatDateTime(c.stageEnteredAt)}</Td>
                <Td>
                  <Link href={`/police/cases/${c.id}`} className="text-[var(--accent)] text-[13px] font-medium">
                    Open →
                  </Link>
                </Td>
              </Tr>
            ))}
            {inCustody.length === 0 && (
              <Tr>
                <Td colSpan={4} className="text-center text-[var(--ink-faint)]">
                  Nothing currently in custody.
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  display,
  tone,
}: {
  label: string;
  value: number;
  display?: string;
  tone?: "breach";
}) {
  return (
    <Card>
      <CardBody>
        <SectionLabel>{label}</SectionLabel>
        <div
          className={`mt-2 font-mono-id ${display ? "text-[15px] font-semibold" : "text-[28px] font-semibold"} ${
            tone === "breach" ? "text-[var(--breach)]" : "text-[var(--ink)]"
          }`}
        >
          {display ?? value}
        </div>
      </CardBody>
    </Card>
  );
}
