"use client";

import Link from "next/link";
import { LayoutDashboard, FilePlus2 } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardBody, CardHeader, SectionLabel } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { useCases, useAllEvents, useConnectivity } from "@/lib/store";
import { CASE_STATUS_LABELS, EXAM_STEP_LABELS, EXAM_STEPS } from "@/lib/types";
import { statusTone, formatDateTime } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/mo", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mo/cases/new", label: "New case", icon: FilePlus2 },
];

export default function MoDashboardPage() {
  return (
    <RoleShell
      navItems={NAV_ITEMS}
      title="Medical Officer dashboard"
      actions={
        <Link href="/mo/cases/new">
          <Button>New case</Button>
        </Link>
      }
    >
      <DashboardContent />
    </RoleShell>
  );
}

function DashboardContent() {
  const cases = useCases();
  const events = useAllEvents();
  const conn = useConnectivity();

  const active = cases.filter((c) => c.status === "EXAMINATION_IN_PROGRESS");
  const awaitingHandover = cases.filter((c) => c.status === "SEALED_AWAITING_RECEIPT");
  const recent = [...events]
    .filter((e) => e.actorRole === "MO")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active examinations" value={active.length} />
        <StatCard label="Awaiting handover" value={awaitingHandover.length} />
        <StatCard label="Offline queue" value={conn.queueCount} tone={conn.queueCount > 0 ? "pending" : undefined} />
        <StatCard label="Total cases" value={cases.length} />
      </div>

      <Card>
        <CardHeader>
          <SectionLabel>My cases</SectionLabel>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>Case ID</Th>
              <Th>Status</Th>
              <Th>Current step</Th>
              <Th>MLC number</Th>
              <Th>Created</Th>
              <Th></Th>
            </tr>
          </THead>
          <tbody>
            {cases.map((c) => (
              <Tr key={c.id}>
                <Td className="font-mono-id">{c.id}</Td>
                <Td>
                  <StatusChip tone={statusTone(c.status)}>{CASE_STATUS_LABELS[c.status]}</StatusChip>
                </Td>
                <Td className="text-[var(--ink-muted)]">
                  {c.stepIndex < EXAM_STEPS.length ? EXAM_STEP_LABELS[EXAM_STEPS[c.stepIndex]] : "Complete"}
                </Td>
                <Td className="font-mono-id text-[var(--ink-muted)]">{c.mlcNumber}</Td>
                <Td className="text-[var(--ink-muted)]">{formatDateTime(c.createdAt)}</Td>
                <Td>
                  <Link href={`/mo/cases/${c.id}`} className="text-[var(--accent)] text-[13px] font-medium">
                    Open →
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <SectionLabel>Recent activity</SectionLabel>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          {recent.length === 0 && <p className="text-[13px] text-[var(--ink-faint)]">No activity yet.</p>}
          {recent.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-[13px]">
              <div>
                <span className="font-mono-id text-[var(--ink-muted)]">{e.caseId}</span>
                <span className="mx-2 text-[var(--ink-faint)]">·</span>
                <span>{e.action.replaceAll("_", " ").toLowerCase()}</span>
              </div>
              <span className="text-[12px] text-[var(--ink-faint)] font-mono-id">{formatDateTime(e.timestamp)}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "pending" }) {
  return (
    <Card>
      <CardBody>
        <SectionLabel>{label}</SectionLabel>
        <div
          className={`mt-2 text-[28px] font-semibold font-mono-id ${
            tone === "pending" ? "text-[var(--pending)]" : "text-[var(--ink)]"
          }`}
        >
          {value}
        </div>
      </CardBody>
    </Card>
  );
}
