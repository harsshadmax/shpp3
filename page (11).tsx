"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, TriangleAlert, ScrollText } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardBody, CardHeader, SectionLabel } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Select } from "@/components/ui/Field";
import { useCases, useAnomalies } from "@/lib/store";
import { CASE_STATUS_LABELS, type CaseStatus } from "@/lib/types";
import { statusTone, hoursSince, formatDuration, ageingTone, formatDateTime } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/fsl", label: "Tracking board", icon: LayoutDashboard },
  { href: "/fsl/anomalies", label: "Anomalies", icon: TriangleAlert },
  { href: "/fsl/audit-log", label: "Audit log", icon: ScrollText },
];

export default function FslTrackingBoardPage() {
  return (
    <RoleShell navItems={NAV_ITEMS} title="Evidence tracking board">
      <TrackingBoard />
    </RoleShell>
  );
}

function TrackingBoard() {
  const cases = useCases();
  const anomalies = useAnomalies();
  const [status, setStatus] = useState<"ALL" | CaseStatus>("ALL");
  const [station, setStation] = useState("ALL");
  const [integrity, setIntegrity] = useState<"ALL" | "CLEAN" | "COMPROMISED">("ALL");

  const stations = useMemo(() => Array.from(new Set(cases.map((c) => c.policeStation))), [cases]);
  const anomalyCaseIds = useMemo(() => new Set(anomalies.map((a) => a.caseId)), [anomalies]);

  const filtered = cases.filter((c) => {
    if (status !== "ALL" && c.status !== status) return false;
    if (station !== "ALL" && c.policeStation !== station) return false;
    if (integrity === "CLEAN" && anomalyCaseIds.has(c.id)) return false;
    if (integrity === "COMPROMISED" && !anomalyCaseIds.has(c.id)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Total cases" value={cases.length} />
        <Stat label="Completed, clean" value={cases.filter((c) => c.status === "COMPLETED").length} tone="verified" />
        <Stat
          label="Integrity compromised"
          value={cases.filter((c) => c.status === "INTEGRITY_COMPROMISED").length}
          tone="breach"
        />
        <Stat label="Open anomalies" value={anomalies.length} tone={anomalies.length > 0 ? "breach" : undefined} />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center gap-3">
          <SectionLabel>Filters</SectionLabel>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="max-w-[220px]">
            <option value="ALL">All statuses</option>
            {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((s) => (
              <option key={s} value={s}>
                {CASE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select value={station} onChange={(e) => setStation(e.target.value)} className="max-w-[220px]">
            <option value="ALL">All stations</option>
            {stations.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select value={integrity} onChange={(e) => setIntegrity(e.target.value as typeof integrity)} className="max-w-[180px]">
            <option value="ALL">All integrity</option>
            <option value="CLEAN">Clean only</option>
            <option value="COMPROMISED">Flagged only</option>
          </Select>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <Th>Case ID</Th>
              <Th>Status</Th>
              <Th>Stage</Th>
              <Th>Police station</Th>
              <Th>Created</Th>
              <Th numeric>Age in stage</Th>
              <Th></Th>
            </tr>
          </THead>
          <tbody>
            {filtered.map((c) => {
              const age = hoursSince(c.stageEnteredAt);
              return (
                <Tr key={c.id}>
                  <Td className="font-mono-id">{c.id}</Td>
                  <Td>
                    <StatusChip tone={statusTone(c.status)}>{CASE_STATUS_LABELS[c.status]}</StatusChip>
                  </Td>
                  <Td className="text-[var(--ink-muted)]">{c.currentStage}</Td>
                  <Td className="text-[var(--ink-muted)]">{c.policeStation}</Td>
                  <Td className="text-[var(--ink-muted)]">{formatDateTime(c.createdAt)}</Td>
                  <Td numeric>
                    <StatusChip tone={ageingTone(age)}>{formatDuration(age)}</StatusChip>
                  </Td>
                  <Td>
                    <Link href={`/fsl/cases/${c.id}`} className="text-[var(--accent)] text-[13px] font-medium">
                      Open →
                    </Link>
                  </Td>
                </Tr>
              );
            })}
            {filtered.length === 0 && (
              <Tr>
                <Td colSpan={7} className="text-center text-[var(--ink-faint)]">
                  No cases match these filters.
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "verified" | "breach" }) {
  return (
    <Card>
      <CardBody>
        <SectionLabel>{label}</SectionLabel>
        <div
          className={`mt-2 text-[28px] font-semibold font-mono-id ${
            tone === "verified" ? "text-[var(--verified)]" : tone === "breach" ? "text-[var(--breach)]" : "text-[var(--ink)]"
          }`}
        >
          {value}
        </div>
      </CardBody>
    </Card>
  );
}
