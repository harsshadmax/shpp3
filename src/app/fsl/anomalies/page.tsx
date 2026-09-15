"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, TriangleAlert, ScrollText } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardHeader, SectionLabel } from "@/components/ui/Card";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Select } from "@/components/ui/Field";
import { useAnomalies } from "@/lib/store";
import type { AnomalySeverity } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/fsl", label: "Tracking board", icon: LayoutDashboard },
  { href: "/fsl/anomalies", label: "Anomalies", icon: TriangleAlert },
  { href: "/fsl/audit-log", label: "Audit log", icon: ScrollText },
];

const SEVERITY_ORDER: AnomalySeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const SEVERITY_TONE: Record<AnomalySeverity, ChipTone> = {
  CRITICAL: "breach",
  HIGH: "breach",
  MEDIUM: "pending",
  LOW: "neutral",
};

export default function AnomaliesPage() {
  return (
    <RoleShell navItems={NAV_ITEMS} title="Anomaly detection">
      <AnomaliesContent />
    </RoleShell>
  );
}

function AnomaliesContent() {
  const anomalies = useAnomalies();
  const [severity, setSeverity] = useState<"ALL" | AnomalySeverity>("ALL");

  const sorted = useMemo(
    () =>
      [...anomalies]
        .filter((a) => severity === "ALL" || a.severity === severity)
        .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)),
    [anomalies, severity]
  );

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center gap-3">
        <SectionLabel>{anomalies.length} open anomalies</SectionLabel>
        <Select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)} className="max-w-[180px]">
          <option value="ALL">All severities</option>
          {SEVERITY_ORDER.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </CardHeader>
      <Table>
        <THead>
          <tr>
            <Th>Severity</Th>
            <Th>Case</Th>
            <Th>Rule</Th>
            <Th>Message</Th>
            <Th>Detected</Th>
          </tr>
        </THead>
        <tbody>
          {sorted.map((a) => (
            <Tr key={a.id}>
              <Td>
                <StatusChip tone={SEVERITY_TONE[a.severity]}>{a.severity}</StatusChip>
              </Td>
              <Td className="font-mono-id">
                <Link href={`/fsl/cases/${a.caseId}`} className="text-[var(--accent)]">
                  {a.caseId}
                </Link>
              </Td>
              <Td className="text-[13px] text-[var(--ink-muted)]">{a.rule.replaceAll("_", " ")}</Td>
              <Td className="text-[13px] max-w-[420px]">{a.message}</Td>
              <Td className="font-mono-id text-[12px] text-[var(--ink-faint)]">{formatDateTime(a.detectedAt)}</Td>
            </Tr>
          ))}
          {sorted.length === 0 && (
            <Tr>
              <Td colSpan={5} className="text-center text-[var(--ink-faint)]">
                No anomalies match this filter.
              </Td>
            </Tr>
          )}
        </tbody>
      </Table>
    </Card>
  );
}
