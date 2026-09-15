import { NextRequest } from "next/server";
import {
  findUserByIdentifier,
  verifyPassword,
  sanitizeUser,
  mapRoleToLegacyRole,
  getRoleHome,
} from "@/lib/userStore";
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { apiSuccess, apiError } from "@/lib/apiEnvelope";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: { email?: string; employee_code?: string; identifier?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return apiError("Malformed JSON request body", 400);
    }

    const identifier = (body.identifier || body.email || body.employee_code || "").trim();
    const password = body.password || "";

    if (!identifier || !password) {
      return apiError("Official Email or Employee Code, and Password are required", 400);
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return apiError("Invalid credentials", 401);
    }

    if (!user.is_active) {
      return apiError("Account is inactive. Please contact administrator.", 403);
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return apiError("Invalid credentials", 401);
    }

    const appRole = mapRoleToLegacyRole(user.role);
    const token = await createSessionToken({
      userId: user.id,
      role: appRole,
      name: user.name,
      org: user.facility_id,
      email: user.email,
      employeeCode: user.employee_code,
      facilityId: user.facility_id,
      systemRole: user.role,
    });

    const sanitized = sanitizeUser(user);
    const redirectTo = getRoleHome(user.role);

    const res = apiSuccess({
      user: sanitized,
      role: user.role,
      appRole,
      redirectTo,
    });

    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return apiError(message, 500);
  }
}
