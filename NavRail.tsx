"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, WifiOff, RotateCcw, LogOut, Menu, X } from "lucide-react";
import { useConnectivity, useCurrentUser, toggleSimulateOffline, resetDemoData } from "@/lib/store";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

function NavLinks({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex-1 py-3 px-3 flex flex-col gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href as never}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 h-9 px-3 rounded-[6px] text-[13px] font-medium ${
              active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function NavFooter() {
  const router = useRouter();
  const user = useCurrentUser();
  const conn = useConnectivity();

  async function logout() {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      await fetch("/api/auth/logout", { method: "POST" });
    }
    router.push("/login");
    router.refresh();
  }

  async function onReset() {
    if (!confirm("Reset demo data? All cases, specimens and events will be re-seeded.")) return;
    await resetDemoData();
    router.refresh();
  }

  return (
    <>
      <div className="px-3 pb-3 flex flex-col gap-1">
        <button
          onClick={toggleSimulateOffline}
          className={`flex items-center gap-2.5 h-9 px-3 rounded-[6px] text-[12px] font-medium border ${
            conn.simulateOffline
              ? "bg-[var(--pending-bg)] text-[var(--pending)] border-[var(--pending)]"
              : "border-white/20 text-white/70 hover:bg-white/10"
          }`}
        >
          <WifiOff size={14} />
          Simulate offline {conn.simulateOffline ? "· ON" : ""}
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 h-9 px-3 rounded-[6px] text-[12px] font-medium text-white/70 border border-white/20 hover:bg-white/10"
        >
          <RotateCcw size={14} />
          Reset demo data
        </button>
      </div>

      <div className="px-5 py-4 border-t border-white/15">
        <div className="text-[13px] font-medium">{user?.name ?? "—"}</div>
        <div className="text-[11px] text-white/60">{user?.org ?? ""}</div>
        <button
          onClick={logout}
          className="mt-2 flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white"
        >
          <LogOut size={12} />
          Log out
        </button>
      </div>
    </>
  );
}

export function NavRail({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop / tablet: permanent left rail */}
      <nav className="hidden md:flex w-[232px] shrink-0 bg-[var(--primary)] text-white flex-col h-full">
        <div className="h-[56px] flex items-center gap-2 px-5 border-b border-white/15">
          <ShieldCheck size={18} />
          <span className="font-mono-id text-[14px] font-semibold tracking-wide">PROJECT96</span>
        </div>
        <NavLinks items={items} pathname={pathname} />
        <NavFooter />
      </nav>

      {/* Narrow viewports: collapsed top bar with a drawer */}
      <div className="md:hidden shrink-0 bg-[var(--primary)] text-white">
        <div className="h-[56px] flex items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} />
            <span className="font-mono-id text-[14px] font-semibold tracking-wide">PROJECT96</span>
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="h-8 w-8 flex items-center justify-center rounded-[6px] hover:bg-white/10"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {open && (
          <div className="flex flex-col border-t border-white/15 max-h-[70vh] overflow-y-auto">
            <NavLinks items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
            <NavFooter />
          </div>
        )}
      </div>
    </>
  );
}
