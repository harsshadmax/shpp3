import { NextRequest } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebaseVerify";
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { mapRoleToLegacyRole, getRoleHome, type UserRole } from "@/lib/userStore";
import { apiSuccess, apiError } from "@/lib/apiEnvelope";

export const dynamic = "force-dynamic";

interface FirestoreValue {
  stringValue?: string;
  [key: string]: unknown;
}

interface FirestoreDocument {
  fields?: Record<string, FirestoreValue>;
}

function readField(doc: FirestoreDocument, key: string): string | undefined {
  return doc.fields?.[key]?.stringValue;
}

/**
 * Fetches the caller's own Firestore profile using their Firebase ID token
 * as the bearer credential. Firestore evaluates security rules against that
 * same token, so this only succeeds for the signed-in user's own document —
 * no service-account credential needed for this read.
 */
async function fetchOwnProfile(uid: string, idToken: string): Promise<FirestoreDocument | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as FirestoreDocument;
}

export async function POST(req: NextRequest) {
  try {
    let body: { idToken?: string };
    try {
      body = await req.json();
    } catch {
      return apiError("Malformed JSON request body", 400);
    }

    const idToken = body.idToken;
    if (!idToken) {
      return apiError("Missing idToken", 400);
    }

    const verified = await verifyFirebaseIdToken(idToken);
    if (!verified) {
      return apiError("Invalid or expired Firebase session. Please sign in again.", 401);
    }

    const doc = await fetchOwnProfile(verified.uid, idToken);
    if (!doc) {
      return apiError("No registered profile found for this account. Please register first.", 404);
    }

    const role = (readField(doc, "role") as UserRole | undefined) ?? "MEDICAL_OFFICER";
    const name = readField(doc, "name") ?? verified.email ?? "Officer";
    const org = readField(doc, "facility_id") ?? readField(doc, "org") ?? "Unassigned";
    const phone = readField(doc, "phone");

    const appRole = mapRoleToLegacyRole(role);
    const token = await createSessionToken({
      userId: verified.uid,
      role: appRole,
      name,
      org,
      email: verified.email ?? undefined,
      systemRole: role,
    });

    const redirectTo = getRoleHome(role);
    const res = apiSuccess({ redirectTo, role, name, org, phone });
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return apiError(message, 500);
  }
}
