"use client";

import Link from "next/link";
import { LayoutDashboard, ScanLine, ListChecks } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardHeader, SectionLabel } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { useCases } from "@/lib/store";
import { CASE_STATUS_LABELS } from "@/lib/types";
import { statusTone, ageingTone, hoursSince, formatDuration, formatDateTime } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/police", label: "Dashboard", icon: LayoutDashboard },
  { href: "/police/receive", label: "Receive evidence", icon: ScanLine },
  { href: "/police/custody-register", label: "Custody register", icon: ListChecks },
];

export default function CustodyRegisterPage() {
  return (
    <RoleShell navItems={NAV_ITEMS} title="Custody register">
      <RegisterContent />
    </RoleShell>
  );
}

function RegisterContent() {
  const cases = useCases();
  const held = cases.filter((c) => c.currentStage === "POLICE");

  return (
    <Card>
      <CardHeader>
        <SectionLabel>Currently held — {held.length} case(s)</SectionLabel>
      </CardHeader>
      <Table>
        <THead>
          <tr>
            <Th>Case ID</Th>
            <Th>Status</Th>
            <Th>Since</Th>
            <Th numeric>Age</Th>
            <Th></Th>
          </tr>
        </THead>
        <tbody>
          {held.map((c) => {
            const age = hoursSince(c.stageEnteredAt);
            return (
              <Tr key={c.id}>
                <Td className="font-mono-id">{c.id}</Td>
                <Td>
                  <StatusChip tone={statusTone(c.status)}>{CASE_STATUS_LABELS[c.status]}</StatusChip>
                </Td>
                <Td className="text-[var(--ink-muted)]">{formatDateTime(c.stageEnteredAt)}</Td>
                <Td numeric>
                  <StatusChip tone={ageingTone(age)}>{formatDuration(age)}</StatusChip>
                </Td>
                <Td>
                  <Link href={`/police/cases/${c.id}`} className="text-[var(--accent)] text-[13px] font-medium">
                    Open →
                  </Link>
                </Td>
              </Tr>
            );
          })}
          {held.length === 0 && (
            <Tr>
              <Td colSpan={5} className="text-center text-[var(--ink-faint)]">
                Nothing currently held.
              </Td>
            </Tr>
          )}
        </tbody>
      </Table>
    </Card>
  );
}
