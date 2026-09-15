import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { DemoFooter } from "@/components/ui/Footer";

export default function ForbiddenPage() {
  return (
    <div className="min-h-full flex flex-col bg-[var(--bg)]">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[var(--breach-bg)] flex items-center justify-center">
            <ShieldAlert size={22} color="var(--breach)" />
          </div>
          <h1 className="text-[20px] font-semibold text-[var(--ink)]">
            Insufficient custody authorisation
          </h1>
          <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
            Your session role does not permit access to this registry area. This
            block was enforced at the routing edge, before any page content was
            served.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-[34px] items-center justify-center rounded-[6px] bg-[var(--primary)] px-4 text-[13px] font-medium text-white hover:bg-[var(--primary-hover)]"
          >
            Return to login
          </Link>
        </div>
      </div>
      <DemoFooter />
    </div>
  );
}
