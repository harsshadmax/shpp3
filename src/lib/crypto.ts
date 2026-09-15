/**
 * Web Crypto primitives shared by the hash chain, seal signatures and the
 * session cookie. Runs in the browser, in route handlers, and in the Edge
 * middleware — all three expose `crypto.subtle`.
 */

const encoder = new TextEncoder();

export function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(message));
  return bufToHex(digest);
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bufToHex(sig);
}

export async function hmacVerify(secret: string, message: string, hex: string): Promise<boolean> {
  const key = await hmacKey(secret);
  const sigBytes = new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(message));
}

/**
 * Demo-only signing key for the custody chain (seal payloads, custody event
 * signatures). Generated client-side and shipped in the bundle — see
 * SECURITY.md for why this is acceptable in a database-less prototype and
 * what a production deployment would do instead.
 */
export const CHAIN_SIGNING_KEY = "saec-guard-demo-chain-key-2026";

export const GENESIS_HASH = "0".repeat(64);
