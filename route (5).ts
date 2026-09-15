import { SESSION_COOKIE } from "@/lib/session";
import { apiSuccess } from "@/lib/apiEnvelope";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = apiSuccess({ message: "Logged out successfully" });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
