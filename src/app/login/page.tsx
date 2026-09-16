"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, UserCheck, KeyRound, UserPlus } from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { DemoFooter } from "@/components/ui/Footer";
import { DEMO_PASSWORD } from "@/lib/users";
import { ensureHydrated } from "@/lib/store";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { OtpVerification } from "@/components/auth/OtpVerification";
import { firebaseAuth, firestore } from "@/lib/firebaseClient";

interface DemoAccount {
  role: "MO" | "POLICE" | "FSL" | "ADMIN";
  label: string;
  email: string;
  org: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "MO", label: "Medical Officer", email: "dr.meera@ghc.gov.in", org: "Govt Hospital Chennai" },
  { role: "POLICE", label: "Police IO", email: "io.rajan@tnpolice.gov.in", org: "Guindy Police Station" },
  { role: "FSL", label: "FSL Specialist", email: "admin@fsl.tn.gov.in", org: "Regional FSL Chennai" },
  { role: "ADMIN", label: "System Admin", email: "director@fsl.tn.gov.in", org: "Forensic HQ Chennai" },
];

function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/invalid-email":
      return "Please enter a valid email address";
    default:
      return "Unable to sign in. Please try again.";
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"signin" | "signup" | "otp">(
    searchParams.get("tab") === "signup" ? "signup" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{ idToken: string; phone: string } | null>(null);

  function fillDemo(account: DemoAccount) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  async function finalizeLogin(idToken: string) {
    setPending(true);
    try {
      const res = await fetch("/api/auth/firebase-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Sign-in failed. Please try again.");
        setView("signin");
        setPending(false);
        return;
      }
      router.push(json.data.redirectTo);
      router.refresh();
    } catch {
      setError("Unable to connect to authentication server. Please retry.");
      setView("signin");
      setPending(false);
    }
  }

  async function proceedToOtp(idToken: string, uid: string, skipOtp = false) {
    const profileSnap = await getDoc(doc(firestore, "users", uid));
    const phone = (profileSnap.data()?.phone as string | undefined) ?? "+91 98765 00000";

    if (skipOtp) {
      await finalizeLogin(idToken);
      return;
    }

    setPendingAuth({ idToken, phone });
    setView("otp");
    setPending(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      await ensureHydrated();
      const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      const idToken = await cred.user.getIdToken();
      await proceedToOtp(idToken, cred.user.uid);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      setError(friendlyAuthError(code));
      setPending(false);
    }
  }

  async function viewDemoDashboard() {
    setPending(true);
    setError(null);
    try {
      await ensureHydrated();
      const cred = await signInWithEmailAndPassword(firebaseAuth, "admin@fsl.tn.gov.in", DEMO_PASSWORD);
      const idToken = await cred.user.getIdToken();
      await proceedToOtp(idToken, cred.user.uid, true);
    } catch {
      setError("Unable to load demo dashboard. Please try again.");
      setPending(false);
    }
  }

  function cancelOtp() {
    signOut(firebaseAuth).catch(() => {});
    setPendingAuth(null);
    setView("signin");
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
                PROJECT 96
              </div>
            </div>
          </div>
          <p className="text-center text-[12px] text-[var(--ink-muted)] mb-6">
            Sexual Assault Evidence Custody · Chain of Custody Registry
          </p>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-6 shadow-sm">
            {view === "otp" && pendingAuth ? (
              <OtpVerification
                phone={pendingAuth.phone}
                onVerified={() => finalizeLogin(pendingAuth.idToken)}
                onCancel={cancelOtp}
              />
            ) : (
              <>
                {/* Tab navigation: Sign In vs Sign Up */}
                <div className="flex rounded-[6px] bg-[var(--surface-sunken)] p-1 mb-6 border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => {
                      setView("signin");
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-[4px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      view === "signin"
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
                      setView("signup");
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-[4px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      view === "signup"
                        ? "bg-white text-[var(--ink)] shadow-xs font-semibold"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    <UserPlus size={13} />
                    Register Account
                  </button>
                </div>

                {view === "signup" ? (
                  <SignUpForm
                    onSwitchToSignIn={() => setView("signin")}
                    onCredentialsCreated={(idToken, uid) => proceedToOtp(idToken, uid)}
                  />
                ) : (
                  <>
                    <form onSubmit={submit} className="flex flex-col gap-4">
                      {error && (
                        <div className="p-3 text-[12px] bg-[var(--breach-bg)] border border-[var(--breach)] text-[var(--breach)] rounded-[6px]">
                          {error}
                        </div>
                      )}

                      <FormField label="Official Email Address" hint="e.g. officer@tn.gov.in">
                        <Input
                          type="email"
                          autoComplete="username"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@department.gov.in"
                        />
                      </FormField>

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
                        {pending ? "Authenticating…" : "Continue"}
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
                              {account.email}
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
              </>
            )}
          </div>
        </div>
      </div>
      <DemoFooter />
    </div>
  );
}
