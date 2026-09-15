import { NextRequest } from "next/server";
import { signupSchema, checkIdentifierExists, createUser } from "@/lib/userStore";
import { apiSuccess, apiError } from "@/lib/apiEnvelope";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Malformed JSON request body", 400);
    }

    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const errorMsg = firstIssue
        ? `${firstIssue.path.join(".")}: ${firstIssue.message}`
        : "Validation failed";
      return apiError(errorMsg, 400, { issues: parsed.error.format() });
    }

    const { email, employee_code } = parsed.data;
    const { emailExists, codeExists } = await checkIdentifierExists(email, employee_code);

    if (emailExists) {
      return apiError("A user with this official email already exists", 409);
    }

    if (codeExists) {
      return apiError("A user with this employee/badge code already exists", 409);
    }

    const newUser = await createUser(parsed.data);

    return apiSuccess(newUser, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return apiError(message, 500);
  }
}
