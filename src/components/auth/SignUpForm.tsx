"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/lib/userStore";
import { getRoleHome } from "@/lib/userStore";

const ROLE_OPTIONS: { value: UserRole; label: string; defaultFacility: string }[] = [
  { value: "MEDICAL_OFFICER", label: "Medical Officer (MO)", defaultFacility: "Govt Hospital Chennai" },
  { value: "POLICE", label: "Police Officer (IO)", defaultFacility: "Guindy Police Station" },
  { value: "FSL_OFFICER", label: "Forensic Specialist (FSL)", defaultFacility: "Regional FSL Chennai" },
  { value: "ADMIN", label: "System Administrator", defaultFacility: "Forensic HQ Chennai" },
];

export function SignUpForm({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [role, setRole] = useState<UserRole>("MEDICAL_OFFICER");
  const [facilityId, setFacilityId] = useState("Govt Hospital Chennai");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleRoleChange(selected: UserRole) {
    setRole(selected);
    const matched = ROLE_OPTIONS.find((r) => r.value === selected);
    if (matched) {
      setFacilityId(matched.defaultFacility);
    }
  }

  function validateClient(): boolean {
    const errs: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      errs.name = "Full Name must be at least 2 characters";
    }

    if (!email.trim() || !email.includes("@")) {
      errs.email = "Valid official email is required";
    }

    if (!employeeCode.trim() || employeeCode.trim().length < 3) {
      errs.employeeCode = "Badge/Employee code must be at least 3 characters";
    }

    if (!facilityId.trim() || facilityId.trim().length < 2) {
      errs.facilityId = "Facility/Unit ID is required";
    }

    if (password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    } else if (!/[a-z]/.test(password)) {
      errs.password = "Password must include at least one lowercase letter";
    } else if (!/[A-Z]/.test(password)) {
      errs.password = "Password must include at least one uppercase letter";
    } else if (!/[0-9]/.test(password)) {
      errs.password = "Password must include at least one number";
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    setSuccessMsg(null);

    if (!validateClient()) return;

    setPending(true);

    try {
      // 1. Send signup request to /api/v1/auth/signup
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          employee_code: employeeCode.trim(),
          role,
          facility_id: facilityId.trim(),
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setGlobalError(json.error || "Sign-up failed. Please check your details.");
        setPending(false);
        return;
      }

      setSuccessMsg("Account registered successfully! Signing in…");

      // 2. Automatically log the user in
      const loginRes = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email.trim().toLowerCase(), password }),
      });

      const loginJson = await loginRes.json();
      if (loginRes.ok && loginJson.success) {
        const destination = loginJson.data?.redirectTo || getRoleHome(role);
        router.push(destination);
        router.refresh();
      } else {
        // Redirect to sign in if auto-login fails
        if (onSwitchToSignIn) {
          onSwitchToSignIn();
        } else {
          router.push("/login");
        }
      }
    } catch {
      setGlobalError("Network error. Unable to reach authentication server.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {globalError && (
        <div className="p-3 text-[12px] bg-[var(--breach-bg)] border border-[var(--breach)] text-[var(--breach)] rounded-[6px]">
          {globalError}
        </div>
      )}

      {successMsg && (
        <div className="p-3 text-[12px] bg-[var(--verified-bg)] border border-[var(--verified)] text-[var(--verified)] rounded-[6px]">
          {successMsg}
        </div>
      )}

      <FormField label="Full Name" error={fieldErrors.name}>
        <Input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dr. Priya Sharma"
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Official Email" error={fieldErrors.email}>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="officer@tn.gov.in"
          />
        </FormField>

        <FormField label="Badge / Employee Code" error={fieldErrors.employeeCode}>
          <Input
            type="text"
            required
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            placeholder="EMP-MO-891"
            className="font-mono-id"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Assigned Role">
          <Select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Facility / Unit ID" error={fieldErrors.facilityId}>
          <Input
            type="text"
            required
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            placeholder="e.g. Govt Hospital Chennai"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField
          label="Password"
          error={fieldErrors.password}
          hint="Min 8 chars, uppercase, lowercase & digit"
        >
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </FormField>

        <FormField label="Confirm Password" error={fieldErrors.confirmPassword}>
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </FormField>
      </div>

      <Button type="submit" disabled={pending} className="w-full mt-2">
        {pending ? "Creating Official Account…" : "Register Official Account"}
      </Button>

      {onSwitchToSignIn && (
        <div className="text-center mt-2">
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-[12px] text-[var(--accent)] hover:underline cursor-pointer"
          >
            Already registered? Sign in here
          </button>
        </div>
      )}
    </form>
  );
}
