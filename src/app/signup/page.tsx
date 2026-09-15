"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { DemoFooter } from "@/components/ui/Footer";

export default function SignUpPage() {
  return (
    <div className="min-h-full flex flex-col bg-[var(--bg)]">
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[480px]">
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
            Sexual Assault Evidence Custody · Official Registration
          </p>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-5">
              <h1 className="text-[14px] font-semibold text-[var(--ink)] uppercase tracking-[0.04em]">
                Create Official Account
              </h1>
              <Link
                href="/login"
                className="text-[12px] text-[var(--accent)] hover:underline font-medium"
              >
                ← Back to Sign In
              </Link>
            </div>

            <SignUpForm />
          </div>
        </div>
      </div>
      <DemoFooter />
    </div>
  );
}
