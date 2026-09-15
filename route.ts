import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { findUser, ROLE_HOME } from "@/lib/users";
import { findUserByIdentifier, verifyPassword, mapRoleToLegacyRole, getRoleHome } from "@/lib/userStore";

export async function POST(req: NextRequest) {
  let body: { email?: string; employee_code?: string; identifier?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body" }, { status: 400 });
  }

  const identifier = (body.identifier || body.email || body.employee_code || "").trim();
  const password = body.password || "";
  if (!identifier || !password) {
    return NextResponse.json({ ok: false, error: "Identifier and password are required" }, { status: 400 });
  }

  // 1. Check new userStore first
  const dbUser = await findUserByIdentifier(identifier);
  if (dbUser) {
    if (!dbUser.is_active) {
      return NextResponse.json({ ok: false, error: "Account is inactive. Please contact administrator." }, { status: 403 });
    }
    const isMatch = await verifyPassword(password, dbUser.password_hash);
    if (!isMatch) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const appRole = mapRoleToLegacyRole(dbUser.role);
    const token = await createSessionToken({
      userId: dbUser.id,
      role: appRole,
      name: dbUser.name,
      org: dbUser.facility_id,
      email: dbUser.email,
      employeeCode: dbUser.employee_code,
      facilityId: dbUser.facility_id,
      systemRole: dbUser.role,
    });

    const res = NextResponse.json({
      ok: true,
      role: appRole,
      systemRole: dbUser.role,
      name: dbUser.name,
      org: dbUser.facility_id,
      redirectTo: getRoleHome(dbUser.role),
    });
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res;
  }

  // 2. Fallback to legacy seed list
  const user = findUser(identifier, password);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: user.id,
    role: user.role,
    name: user.name,
    org: user.org,
  });

  const res = NextResponse.json({
    ok: true,
    role: user.role,
    name: user.name,
    org: user.org,
    redirectTo: ROLE_HOME[user.role],
  });
  res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return res;
}

