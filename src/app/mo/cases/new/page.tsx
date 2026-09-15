"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, FilePlus2 } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardBody, CardHeader, SectionLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createCase, useCurrentUser } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/mo", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mo/cases/new", label: "New case", icon: FilePlus2 },
];

const AGE_BANDS = ["18–25", "26–35", "36–45", "46–60", "60+"];

export default function NewCasePage() {
  return (
    <RoleShell navItems={NAV_ITEMS} title="New case">
      <NewCaseForm />
    </RoleShell>
  );
}

function NewCaseForm() {
  const router = useRouter();
  const user = useCurrentUser();
  const [hospital, setHospital] = useState(user?.org ?? "");
  const [mlcNumber, setMlcNumber] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [examiningOfficer, setExaminingOfficer] = useState(user?.name ?? "");
  const [ageBand, setAgeBand] = useState(AGE_BANDS[0]);
  const [sex, setSex] = useState<"F" | "M" | "X">("F");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!mlcNumber.trim() || !policeStation.trim()) {
      setError("MLC number and police station of jurisdiction are required.");
      return;
    }
    setPending(true);
    try {
      const record = await createCase({
        hospital,
        mlcNumber: mlcNumber.trim(),
        policeStation: policeStation.trim(),
        examiningOfficer,
        ageBand,
        sex,
      });
      router.push(`/mo/cases/${record.id}`);
    } catch {
      setError("Could not create case. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="max-w-[640px]">
      <Card>
        <CardHeader>
          <SectionLabel>Case intake</SectionLabel>
          <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
            No survivor identity is recorded. Age band and sex are the only demographic fields.
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <FormField label="Hospital">
              <Input value={hospital} onChange={(e) => setHospital(e.target.value)} required />
            </FormField>
            <FormField label="MLC number">
              <Input
                value={mlcNumber}
                onChange={(e) => setMlcNumber(e.target.value)}
                placeholder="MLC/2026/0149"
                className="font-mono-id"
                required
              />
            </FormField>
            <FormField label="Police station of jurisdiction">
              <Input
                value={policeStation}
                onChange={(e) => setPoliceStation(e.target.value)}
                placeholder="Guindy Police Station"
                required
              />
            </FormField>
            <FormField label="Examining officer">
              <Input value={examiningOfficer} onChange={(e) => setExaminingOfficer(e.target.value)} required />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Age band">
                <Select value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>
                  {AGE_BANDS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Sex">
                <Select value={sex} onChange={(e) => setSex(e.target.value as "F" | "M" | "X")}>
                  <option value="F">F</option>
                  <option value="M">M</option>
                  <option value="X">X</option>
                </Select>
              </FormField>
            </div>
            {error && <p className="text-[12px] text-[var(--breach)]">{error}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create case & begin examination"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
