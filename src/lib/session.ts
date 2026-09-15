import { hmacSha256Hex, hmacVerify } from "./crypto";
import type { Role } from "./types";

/**
 * Server-only session signing secret. Never imported from a "use client"
 * module — see SECURITY.md for the threat model this mocks.
 */
const SESSION_SECRET = "saec-guard-demo-session-secret-2026-do-not-reuse";

export const SESSION_COOKIE = "saec_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h shift

export interface SessionPayload {
  userId: string;
  role: Role;
  name: string;
  org: string;
  email?: string;
  employeeCode?: string;
  facilityId?: string;
  systemRole?: string;
  exp: number;
}

function base64urlEncode(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return decodeURIComponent(escape(atob(padded)));
}

export async function createSessionToken(payload: Omit<SessionPayload, "exp">): Promise<string> {
  const full: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const body = base64urlEncode(JSON.stringify(full));
  const sig = await hmacSha256Hex(SESSION_SECRET, body);
  return `${body}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const valid = await hmacVerify(SESSION_SECRET, body, sig);
  if (!valid) return null;
  try {
    const payload = JSON.parse(base64urlDecode(body)) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

