import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies a Firebase Auth ID token server-side without the Admin SDK (which
 * would need a service-account credential). Firebase ID tokens are standard
 * RS256 JWTs signed with keys published at Google's JWKS endpoint, so a
 * normal signature + claims check is sufficient and needs no extra secret.
 */

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export interface VerifiedFirebaseUser {
  uid: string;
  email: string | null;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (!payload.sub) return null;
    return { uid: payload.sub, email: (payload.email as string) ?? null };
  } catch {
    return null;
  }
}
