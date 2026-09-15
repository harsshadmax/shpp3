import { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { findUserByIdentifier, sanitizeUser } from "@/lib/userStore";
import { apiSuccess, apiError } from "@/lib/apiEnvelope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      return apiError("Unauthorized", 401);
    }

    // Try finding fresh user record if email/id exists
    const identifier = session.email || session.userId;
    const userRecord = await findUserByIdentifier(identifier);

    const userProfile = userRecord
      ? sanitizeUser(userRecord)
      : {
          id: session.userId,
          name: session.name,
          email: session.email || "",
          employee_code: session.employeeCode || "",
          role: session.systemRole || session.role,
          facility_id: session.facilityId || session.org,
          is_active: true,
          created_at: "",
          updated_at: "",
        };

    return apiSuccess({
      user: userProfile,
      role: session.systemRole || session.role,
      appRole: session.role,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return apiError(message, 500);
  }
}
