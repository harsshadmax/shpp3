"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Live-demo device push: for one pre-designated phone number, the code is
// fixed and also pushed to a physical phone via ntfy.sh (free, no-account
// pub/sub notifications) so a live audience sees a real notification land
// instead of only the on-screen fallback. Every other phone number is
// unaffected and only ever gets the normal random on-screen code.
const LIVE_DEMO_PHONE_DIGITS = "918122914548"; // +91 8122914548
const LIVE_DEMO_OTP = "270907";
const NTFY_TOPIC = "otp-demo-c3c1118bcf2454bb5d228b25";

function isLiveDemoPhone(phone: string): boolean {
  return phone.replace(/\D/g, "") === LIVE_DEMO_PHONE_DIGITS;
}

async function pushOtpToDevice(code: string): Promise<void> {
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: "POST",
      body: `Your demo OTP is ${code}`,
      headers: { Title: "Project 96 demo OTP", Priority: "high", Tags: "closed_lock_with_key" },
    });
  } catch {
    // Best-effort only — the on-screen fallback code still works if this fails.
  }
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  const last4 = digits.slice(-4);
  return `+91 •••••• ${last4}`;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const RESEND_SECONDS = 30;

export function OtpVerification({
  phone,
  onVerified,
  onCancel,
}: {
  phone: string;
  onVerified: () => void;
  onCancel: () => void;
}) {
  const liveDemo = isLiveDemoPhone(phone);
  const [demoCode, setDemoCode] = useState(() => (liveDemo ? LIVE_DEMO_OTP : generateCode()));
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    if (liveDemo) void pushOtpToDevice(demoCode);
    // Fires once on mount only; resend() handles subsequent pushes itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setError(null);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d) && next.join("").length === 6) {
      submit(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function submit(code: string) {
    if (code === demoCode) {
      onVerified();
    } else {
      setError("Incorrect code. Please check and try again.");
      setDigits(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    }
  }

  function resend() {
    const next = liveDemo ? LIVE_DEMO_OTP : generateCode();
    setDemoCode(next);
    if (liveDemo) void pushOtpToDevice(next);
    setSecondsLeft(RESEND_SECONDS);
    setDigits(Array(6).fill(""));
    setError(null);
    inputRefs.current[0]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center text-center gap-2 pb-1">
        <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
          <ShieldCheck size={18} color="white" />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[var(--ink)]">Verify your identity</div>
          <p className="text-[12px] text-[var(--ink-muted)] mt-0.5">
            Enter the 6-digit code sent to {maskPhone(phone)}
          </p>
        </div>
      </div>

      <div className="p-2.5 rounded-[6px] border border-dashed border-[var(--accent)] bg-[var(--surface-sunken)] text-center">
        <p className="text-[10px] font-semibold tracking-[0.06em] uppercase text-[var(--ink-faint)]">
          Prototype mode · SMS not actually sent
        </p>
        <p className="font-mono-id text-[16px] font-semibold tracking-[0.2em] text-[var(--accent)] mt-1">
          {demoCode}
        </p>
      </div>

      {error && (
        <div className="p-2.5 text-[12px] bg-[var(--breach-bg)] border border-[var(--breach)] text-[var(--breach)] rounded-[6px] text-center">
          {error}
        </div>
      )}

      <div className="flex justify-center gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-11 w-9 text-center text-[16px] font-mono-id font-semibold rounded-[6px] border border-[var(--border-strong)] bg-white outline-none focus-visible:border-[var(--accent)]"
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--ink-faint)]">
        {secondsLeft > 0 ? (
          <span>Resend code in {secondsLeft}s</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            className="flex items-center gap-1 text-[var(--accent)] hover:underline cursor-pointer"
          >
            <RotateCcw size={12} />
            Resend code
          </button>
        )}
      </div>

      <Button type="button" variant="secondary" onClick={onCancel} className="w-full text-[12px]">
        Back to sign in
      </Button>
    </div>
  );
}
