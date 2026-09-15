"use client";

import { useMemo, useState } from "react";
import { LayoutDashboard, TriangleAlert, ScrollText, Download } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardHeader, SectionLabel } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Select, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useAllEvents, useCases } from "@/lib/store";
import type { Role } from "@/lib/types";
import { actionLabel } from "@/lib/actionLabels";
import { formatDateTime } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/fsl", label: "Tracking board", icon: LayoutDashboard },
  { href: "/fsl/anomalies", label: "Anomalies", icon: TriangleAlert },
  { href: "/fsl/audit-log", label: "Audit log", icon: ScrollText },
];

export default function AuditLogPage() {
  return (
    <RoleShell navItems={NAV_ITEMS} title="Audit log">
      <AuditLogContent />
    </RoleShell>
  );
}

function AuditLogContent() {
  const events = useAllEvents();
  const cases = useCases();
  const [caseId, setCaseId] = useState("ALL");
  const [role, setRole] = useState<"ALL" | Role>("ALL");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return [...events]
      .filter((e) => caseId === "ALL" || e.caseId === caseId)
      .filter((e) => role === "ALL" || e.actorRole === role)
      .filter((e) => !q || e.action.toLowerCase().includes(q.toLowerCase()) || e.actorName.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [events, caseId, role, q]);

  function exportCsv() {
    const header = ["id", "caseId", "timestamp", "actorName", "actorRole", "action", "deviceId", "geoLabel", "prevHash", "hash"];
    const rows = filtered.map((e) => [
      e.id,
      e.caseId,
      e.timestamp,
      e.actorName,
      e.actorRole,
      e.action,
      e.deviceId,
      e.geoLabel,
      e.prevHash,
      e.hash,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project96-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center gap-3">
        <SectionLabel>{filtered.length} events</SectionLabel>
        <Select value={caseId} onChange={(e) => setCaseId(e.target.value)} className="max-w-[200px]">
          <option value="ALL">All cases</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </Select>
        <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="max-w-[160px]">
          <option value="ALL">All roles</option>
          <option value="MO">MO</option>
          <option value="POLICE">Police</option>
          <option value="FSL">FSL</option>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action or actor" className="max-w-[220px]" />
        <div className="flex-1" />
        <Button variant="secondary" onClick={exportCsv}>
          <Download size={14} /> Export CSV
        </Button>
      </CardHeader>
      <Table>
        <THead>
          <tr>
            <Th>Timestamp</Th>
            <Th>Case</Th>
            <Th>Actor</Th>
            <Th>Action</Th>
            <Th>Device</Th>
            <Th>Hash</Th>
          </tr>
        </THead>
        <tbody>
          {filtered.map((e) => (
            <Tr key={e.id}>
              <Td className="font-mono-id text-[12px] text-[var(--ink-muted)]">{formatDateTime(e.timestamp)}</Td>
              <Td className="font-mono-id">{e.caseId}</Td>
              <Td className="text-[13px]">
                {e.actorName} · {e.actorRole}
              </Td>
              <Td className="text-[13px]">{actionLabel(e.action)}</Td>
              <Td className="font-mono-id text-[12px] text-[var(--ink-faint)]">{e.deviceId}</Td>
              <Td className="font-mono-id text-[12px] text-[var(--ink-faint)]">{e.hash.slice(0, 10)}…</Td>
            </Tr>
          ))}
          {filtered.length === 0 && (
            <Tr>
              <Td colSpan={6} className="text-center text-[var(--ink-faint)]">
                No events match this filter.
              </Td>
            </Tr>
          )}
        </tbody>
      </Table>
    </Card>
  );
}
