import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { isActionAllowedForRole } from "@/lib/actions";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GENESIS_HASH = "0".repeat(64);

/**
 * Computes a deterministic SHA-256 hash across chain linkage properties.
 */
function computeNodeHash(
  prevHash: string,
  timestamp: string,
  actorId: string,
  role: string,
  action: string,
  caseId: string,
  specimenId: string | null,
  details: Record<string, unknown>
): string {
  const content = [
    prevHash,
    timestamp,
    actorId,
    role,
    action,
    caseId,
    specimenId ?? "",
    JSON.stringify(details ?? {}),
  ].join("|");

  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    let body: {
      action?: string;
      caseId?: string;
      specimenId?: string;
      sealCode?: string;
      details?: Record<string, unknown>;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Malformed request body" }, { status: 400 });
    }

    if (!body.action || !body.caseId) {
      return NextResponse.json({ ok: false, error: "action and caseId are required" }, { status: 400 });
    }

    if (!isActionAllowedForRole(session.role, body.action)) {
      return NextResponse.json(
        { ok: false, error: `Role ${session.role} is not authorised for action ${body.action}` },
        { status: 403 }
      );
    }

    // 1. Fetch latest log entry for this case to resolve previous block hash
    let latestLog: { current_hash?: string } | null = null;
    if (isSupabaseConfigured) {
      const { data, error: fetchError } = await supabase
        .from("custody_logs")
        .select("current_hash")
        .eq("case_id", body.caseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Failed to query chain tip:", fetchError.message);
      } else {
        latestLog = data;
      }
    }

    const prevHash = latestLog?.current_hash || GENESIS_HASH;
    const timestamp = new Date().toISOString();
    const actorId = session.userId || session.name;

    // 2. Compute canonical SHA-256 hash server-side
    const currentHash = computeNodeHash(
      prevHash,
      timestamp,
      actorId,
      session.role,
      body.action,
      body.caseId,
      body.specimenId || null,
      body.details || {}
    );

    // 3. Persist cryptographically linked log record
    let dbLog: { id?: string } | null = null;
    let hasDbError = false;

    if (isSupabaseConfigured) {
      const { data, error: dbError } = await supabase
        .from("custody_logs")
        .insert([
          {
            case_id: body.caseId,
            specimen_id: body.specimenId || null,
            stage: body.action,
            releasing_actor: null,
            receiving_actor: actorId,
            seal_code: body.sealCode || null,
            prev_hash: prevHash,
            current_hash: currentHash,
            is_anomaly: false,
            created_at: timestamp,
          },
        ])
        .select()
        .single();

      if (dbError) {
        console.error("Supabase audit insert error:", dbError.message);
        hasDbError = true;
      } else {
        dbLog = data;
      }
    }

    return NextResponse.json({
      ok: true,
      ackedBy: { userId: session.userId, role: session.role, name: session.name },
      ackedAt: timestamp,
      prevHash,
      currentHash,
      persisted: isSupabaseConfigured ? !hasDbError : true,
      logId: dbLog?.id ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

