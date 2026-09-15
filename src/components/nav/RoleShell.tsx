"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavRail, type NavItem } from "./NavRail";
import { TopBar } from "./TopBar";
import { DemoFooter } from "@/components/ui/Footer";
import { ensureHydrated, wireConnectivityListeners, setCurrentUser, useHydrated, useCurrentUser } from "@/lib/store";

export function RoleShell({
  navItems,
  title,
  actions,
  children,
}: {
  navItems: NavItem[];
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const user = useCurrentUser();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    wireConnectivityListeners();
    void ensureHydrated();

    // Check modern v1 auth session first
    fetch("/api/v1/auth/me")
      .then(async (r) => {
        if (r.ok) {
          const json = await r.json();
          if (json.success && json.data?.user) {
            setCurrentUser({
              userId: json.data.user.id,
              name: json.data.user.name,
              role: (json.data.appRole || json.data.user.role) as "MO" | "POLICE" | "FSL",
              org: json.data.user.facility_id || "SAEC Unit",
            });
            setSessionChecked(true);
            return;
          }
        }

        // Fallback to legacy endpoint
        const legacyRes = await fetch("/api/auth/me");
        if (legacyRes.ok) {
          const legacyJson = await legacyRes.json();
          if (legacyJson.ok && legacyJson.user) {
            setCurrentUser(legacyJson.user);
            setSessionChecked(true);
            return;
          }
        }

        // If completely unauthenticated, redirect to login
        router.push(`/login?next=${encodeURIComponent(pathname || "")}`);
      })
      .catch(() => {
        setSessionChecked(true);
      });
  }, [pathname, router]);


  const ready = hydrated && sessionChecked && user;

  return (
    <div className="h-full flex flex-col md:flex-row">
      <NavRail items={navItems} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} actions={actions} />
        <div className="flex-1 overflow-y-auto">
          {ready ? (
            <div className="max-w-[1200px] mx-auto px-6 py-6">{children}</div>
          ) : (
            <div className="max-w-[1200px] mx-auto px-6 py-6 text-[13px] text-[var(--ink-faint)]">
              Loading registry…
            </div>
          )}
        </div>
        <DemoFooter />
      </div>
    </div>
  );
}
