"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setCurrentUser, ensureHydrated } from "@/lib/store";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";

export interface AuthUserProfile {
  id: string;
  name: string;
  email: string;
  employee_code?: string;
  role: string;
  appRole?: "MO" | "POLICE" | "FSL";
  facility_id: string;
  is_active: boolean;
}

interface AuthContextType {
  user: AuthUserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function checkSession() {
    try {
      await ensureHydrated();

      // Check /api/v1/auth/me first
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.user) {
          const profile: AuthUserProfile = {
            ...data.data.user,
            appRole: data.data.appRole,
          };
          setUser(profile);
          setCurrentUser({
            userId: profile.id,
            name: profile.name,
            role: (data.data.appRole || profile.role) as "MO" | "POLICE" | "FSL",
            org: profile.facility_id || "SAEC Unit",
          });
          setLoading(false);
          return;
        }
      }

      // Legacy fallback check: /api/auth/me
      const legacyRes = await fetch("/api/auth/me");
      if (legacyRes.ok) {
        const legacyData = await legacyRes.json();
        if (legacyData.ok && legacyData.user) {
          setUser({
            id: legacyData.user.userId,
            name: legacyData.user.name,
            email: "",
            role: legacyData.user.role,
            appRole: legacyData.user.role,
            facility_id: legacyData.user.org,
            is_active: true,
          });
          setCurrentUser(legacyData.user);
          setLoading(false);
          return;
        }
      }

      // Unauthenticated
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      await fetch("/api/auth/logout", { method: "POST" });
    }
    await signOut(firebaseAuth).catch(() => {});
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        await ensureHydrated();
        const res = await fetch("/api/v1/auth/me");
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.user) {
            const profile: AuthUserProfile = {
              ...data.data.user,
              appRole: data.data.appRole,
            };
            setUser(profile);
            setCurrentUser({
              userId: profile.id,
              name: profile.name,
              role: (data.data.appRole || profile.role) as "MO" | "POLICE" | "FSL",
              org: profile.facility_id || "SAEC Unit",
            });
            setLoading(false);
            return;
          }
        }

        const legacyRes = await fetch("/api/auth/me");
        if (!mounted) return;
        if (legacyRes.ok) {
          const legacyData = await legacyRes.json();
          if (legacyData.ok && legacyData.user) {
            setUser({
              id: legacyData.user.userId,
              name: legacyData.user.name,
              email: "",
              role: legacyData.user.role,
              appRole: legacyData.user.role,
              facility_id: legacyData.user.org,
              is_active: true,
            });
            setCurrentUser(legacyData.user);
            setLoading(false);
            return;
          }
        }

        setUser(null);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshSession: checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthGuard({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: ("MO" | "POLICE" | "FSL" | string)[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Not authenticated: redirect to login with return path
      const loginUrl = pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login";
      router.push(loginUrl);
    } else if (!loading && user && allowedRoles && allowedRoles.length > 0) {
      const activeRole = user.appRole || user.role;
      if (!allowedRoles.includes(activeRole) && !allowedRoles.includes(user.role)) {
        router.push("/403");
      }
    }
  }, [user, loading, allowedRoles, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] text-[var(--ink-muted)]">Verifying authentication…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
