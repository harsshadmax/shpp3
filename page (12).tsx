"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserCheck, KeyRound, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { DemoFooter } from "@/components/ui/Footer";
import { DEMO_PASSWORD } from "@/lib/users";
import { ensureHydrated } from "@/lib/store";
import { SignUpForm } from "@/components/auth/SignUpForm";

interface DemoAccount {
  role: "MO" | "POLICE" | "FSL" | "ADMIN";
  label: string;
  email: string;
  code: string;
  org: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "MO",
    label: "Medical Officer",
    email: "dr.meera@ghc.gov.in",
    code: "EMP-MO-001",
    org: "Govt Hospital Chennai",
  },
  {
    role: "POLICE",
    label: "Police IO",
    email: "io.rajan@tnpolice.gov.in",
    code: "EMP-POL-104",
    org: "Guindy Police Station",
  },
  {
    role: "FSL",
    label: "FSL Specialist",
    email: "admin@fsl.tn.gov.in",
    code: "EMP-FSL-009",
    org: "Regional FSL Chennai",
  },
  {
    role: "ADMIN",
    label: "System Admin",
    email: "director@fsl.tn.gov.in",
    code: "EMP-ADM-001",
    org: "Forensic HQ Chennai",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "signup") return "signup";
    }
    return "signin";
  });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [useEmployeeCodeMode, setUseEmployeeCodeMode] = useState(false);


  function fillDemo(account: DemoAccount) {
    if (useEmployeeCodeMode) {
      setIdentifier(account.code);
    } else {
      setIdentifier(account.email);
    }
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  async function loginWithCredentials(loginId: string, loginPassword: string, redirectOverride?: string) {
    setPending(true);
    setError(null);

    try {
      await ensureHydrated();

      // Primary: Modern /api/v1/auth/login endpoint
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginId.trim(), password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Fallback to legacy endpoint if v1 returned unexpected error
        const legacyRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: loginId.trim(), password: loginPassword }),
        });
        const legacyData = await legacyRes.json();

        if (!legacyRes.ok || !legacyData.ok) {
          setError(data.error || legacyData.error || "Invalid login credentials");
          setPending(false);
          return;
        }

        router.push(redirectOverride ?? legacyData.redirectTo);
        router.refresh();
        return;
      }

      const destination = redirectOverride ?? data.data?.redirectTo ?? "/fsl";
      router.push(destination);
      router.refresh();
    } catch {
      setError("Unable to connect to authentication server. Please retry.");
      setPending(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await loginWithCredentials(identifier, password);
  }

  async function viewDemoDashboard() {
    // One-click path: signs in as FSL specialist / admin and opens dashboard
    await loginWithCredentials("admin@fsl.tn.gov.in", DEMO_PASSWORD, "/fsl");
  }

  return (
    <div className="min-h-full flex flex-col bg-[var(--bg)]">
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[460px]">
          {/* Header branding */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-[6px] bg-[var(--primary)] flex items-center justify-center">
              <ShieldCheck size={18} color="white" />
            </div>
            <div>
              <div className="font-mono-id text-[16px] font-semibold tracking-wide text-[var(--ink)]">
                PROJECT96
              </div>
            </div>
          </div>
          <p className="text-center text-[12px] text-[var(--ink-muted)] mb-6">
            Sexual Assault Evidence Custody · Chain of Custody Registry
          </p>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-6 shadow-sm">
            {/* Tab navigation: Sign In vs Sign Up */}
            <div className="flex rounded-[6px] bg-[var(--surface-sunken)] p-1 mb-6 border border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin");
                  setError(null);
                }}
                className={`flex-1 py-1.5 text-[12px] font-medium rounded-[4px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "signin"
                    ? "bg-white text-[var(--ink)] shadow-xs font-semibold"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                <KeyRound size={13} />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setError(null);
                }}
                className={`flex-1 py-1.5 text-[12px] font-medium rounded-[4px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "signup"
                    ? "bg-white text-[var(--ink)] shadow-xs font-semibold"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                <UserPlus size={13} />
                Register Account
              </button>
            </div>

            {activeTab === "signup" ? (
              <SignUpForm onSwitchToSignIn={() => setActiveTab("signin")} />
            ) : (
              <>
                <form onSubmit={submit} className="flex flex-col gap-4">
                  {error && (
                    <div className="p-3 text-[12px] bg-[var(--breach-bg)] border border-[var(--breach)] text-[var(--breach)] rounded-[6px]">
                      {error}
                    </div>
                  )}

                  <FormField
                    label={useEmployeeCodeMode ? "Employee / Badge Code" : "Official Email Address"}
                    hint={
                      useEmployeeCodeMode
                        ? "e.g. EMP-MO-001 or EMP-POL-104"
                        : "e.g. officer@tn.gov.in"
                    }
                  >
                    <Input
                      type={useEmployeeCodeMode ? "text" : "text"}
                      autoComplete="username"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={useEmployeeCodeMode ? "EMP-MO-001" : "name@department.gov.in"}
                      className={useEmployeeCodeMode ? "font-mono-id" : ""}
                    />
                  </FormField>

                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={() => setUseEmployeeCodeMode(!useEmployeeCodeMode)}
                      className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      {useEmployeeCodeMode ? "Log in with Official Email instead" : "Log in with Badge/Employee Code instead"}
                    </button>
                  </div>

                  <FormField label="Password">
                    <Input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </FormField>

                  <Button type="submit" disabled={pending} className="w-full">
                    {pending ? "Authenticating…" : "Sign In"}
                  </Button>
                </form>

                {/* Pre-fill demo credentials */}
                <div className="mt-6 pt-5 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[var(--ink-muted)]">
                      Quick Demo Logins
                    </p>
                    <span className="text-[10px] text-[var(--ink-faint)] font-mono-id">Password: Demo@2026</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((account) => (
                      <button
                        key={account.role}
                        type="button"
                        onClick={() => fillDemo(account)}
                        className="flex flex-col items-start p-2.5 rounded-[6px] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-sunken)] text-left transition-all cursor-pointer bg-white"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[12px] font-medium text-[var(--ink)] flex items-center gap-1">
                            <UserCheck size={12} className="text-[var(--accent)]" />
                            {account.label}
                          </span>
                          <span className="font-mono-id text-[10px] bg-[var(--surface-sunken)] px-1.5 py-0.5 rounded text-[var(--ink-muted)]">
                            {account.role}
                          </span>
                        </div>
                        <span className="font-mono-id text-[10px] text-[var(--ink-faint)] mt-1 truncate w-full">
                          {account.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* One-click Demo Access */}
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={viewDemoDashboard}
                    disabled={pending}
                    className="w-full text-[12px]"
                  >
                    {pending ? "Loading…" : "Skip Login → Open FSL Demo Registry"}
                  </Button>
                  <p className="mt-2 text-[11px] text-center text-[var(--ink-faint)]">
                    Immediately loads seeded cases and chain verification engine.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <DemoFooter />
    </div>
  );
}
