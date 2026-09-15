"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ScanLine, ListChecks, ScanFace } from "lucide-react";
import { RoleShell } from "@/components/nav/RoleShell";
import { Card, CardBody, CardHeader, SectionLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { SweepBar } from "@/components/ui/SweepBar";
import { VerificationLines } from "@/components/ui/VerificationLines";
import { verifyIncoming, acceptCustody, type VerifyIncomingResult } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/police", label: "Dashboard", icon: LayoutDashboard },
  { href: "/police/receive", label: "Receive evidence", icon: ScanLine },
  { href: "/police/custody-register", label: "Custody register", icon: ListChecks },
];

export default function ReceiveEvidencePage() {
  return (
    <RoleShell navItems={NAV_ITEMS} title="Receive evidence">
      <ReceiveFlow />
    </RoleShell>
  );
}

function ReceiveFlow() {
  const router = useRouter();
  const [qrPayloadRaw, setQrPayloadRaw] = useState("");
  const [transferCode, setTransferCode] = useState("");
  const [sweeping, setSweeping] = useState(false);
  const [result, setResult] = useState<VerifyIncomingResult | null>(null);

  const [sealCondition, setSealCondition] = useState<"Intact" | "Damaged" | "Tampered">("Intact");
  const [specimenCountConfirmed, setSpecimenCountConfirmed] = useState<number>(0);
  const [remarks, setRemarks] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [outcome, setOutcome] = useState<"accepted" | "declined" | null>(null);

  async function runVerification(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setOutcome(null);
    setSweeping(true);
    const r = await verifyIncoming({ qrPayloadRaw, transferCode });
    setTimeout(() => {
      setSweeping(false);
      setResult(r);
      if (r.parsedPayload) setSpecimenCountConfirmed(r.parsedPayload.specimenIds.length);
    }, 420);
  }

  async function decide(accept: boolean) {
    if (!result?.caseId) return;
    setDeciding(true);
    const { accepted } = await acceptCustody(result.caseId, {
      sealCondition: accept ? sealCondition : sealCondition === "Intact" ? "Damaged" : sealCondition,
      sealNoObserved: result.parsedPayload?.sealNo ?? "",
      specimenCountConfirmed,
      transferCodeValid: result.ok,
      remarks,
    });
    setDeciding(false);
    setOutcome(accepted ? "accepted" : "declined");
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6 items-start">
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-10">
          <div className="relative h-44 w-44 border-2 border-dashed border-[var(--border-strong)] rounded-[6px] flex items-center justify-center bg-[var(--surface-sunken)]">
            <ScanFace size={32} color="var(--ink-faint)" />
          </div>
          <p className="text-[12px] text-center text-[var(--ink-faint)] max-w-[220px]">
            Camera preview unavailable on this device. Use manual entry — required for projector demos.
          </p>
        </CardBody>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <SectionLabel>Manual verification</SectionLabel>
          </CardHeader>
          <CardBody>
            <form onSubmit={runVerification} className="flex flex-col gap-4">
              <FormField label="Paste QR payload" hint="The JSON payload printed beneath the seal QR at handover.">
                <Textarea
                  value={qrPayloadRaw}
                  onChange={(e) => setQrPayloadRaw(e.target.value)}
                  placeholder='{"caseId":"SAEC-2026-0142","specimenIds":[...],"sealNo":"SEAL-84102",...}'
                  className="font-mono-id"
                  required
                />
              </FormField>
              <FormField label="Enter transfer code">
                <Input
                  value={transferCode}
                  onChange={(e) => setTransferCode(e.target.value)}
                  placeholder="603157"
                  className="font-mono-id max-w-[160px]"
                  maxLength={6}
                  required
                />
              </FormField>
              <div>
                <Button type="submit" disabled={sweeping}>
                  {sweeping ? "Verifying…" : "Run verification"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {sweeping && (
          <Card>
            <CardBody>
              <SweepBar running={sweeping} />
            </CardBody>
          </Card>
        )}

        {result && !sweeping && (
          <Card>
            <CardHeader>
              <SectionLabel>Verification result — {result.caseId ?? "unresolved"}</SectionLabel>
            </CardHeader>
            <CardBody>
              {result.error ? (
                <p className="text-[13px] text-[var(--breach)]">{result.error}</p>
              ) : (
                <VerificationLines steps={result.steps} />
              )}
            </CardBody>
          </Card>
        )}

        {result?.ok && !outcome && (
          <Card>
            <CardHeader>
              <SectionLabel>Verify & accept</SectionLabel>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Physical seal condition">
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
                </FormField>
              </div>
              <FormField label="Remarks (optional)">
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </FormField>
              <div className="flex gap-3">
                <Button onClick={() => decide(true)} disabled={deciding || sealCondition !== "Intact"}>
                  {deciding ? "Recording…" : "Accept custody"}
                </Button>
                <Button variant="destructive" onClick={() => decide(false)} disabled={deciding}>
                  Decline & flag anomaly
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {outcome && result?.caseId && (
          <Card>
            <CardBody className="flex items-center justify-between">
              <p className={`text-[13px] font-medium ${outcome === "accepted" ? "text-[var(--verified)]" : "text-[var(--breach)]"}`}>
                {outcome === "accepted"
                  ? "Custody accepted. Case moved to your custody register."
                  : "Custody declined. Anomaly recorded against this case."}
              </p>
              <Button variant="secondary" onClick={() => router.push(`/police/cases/${result.caseId}`)}>
                Open case →
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
