import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Role as LegacyRole } from "./types";

export type UserRole = "MEDICAL_OFFICER" | "POLICE" | "FSL_OFFICER" | "ADMIN";

export interface UserRecord {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  facility_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SanitizedUser = Omit<UserRecord, "password_hash">;

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  employee_code: z.string().trim().min(3, "Employee/badge code must be at least 3 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["MEDICAL_OFFICER", "POLICE", "FSL_OFFICER", "ADMIN"], {
    message: "Role must be MEDICAL_OFFICER, POLICE, FSL_OFFICER, or ADMIN",
  }),
  facility_id: z.string().trim().min(2, "Facility ID must be at least 2 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or Employee code is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Default Bcrypt Hash for Demo@2026
const DEMO_PASSWORD_HASH = "$2b$10$7FIbZjJpVkdiGyZMydof4eopoUPpij5t1O196ny28Nhb2xLepZbwm";

export const INITIAL_USERS: UserRecord[] = [
  {
    id: "a1111111-1111-4111-a111-111111111111",
    employee_code: "EMP-MO-001",
    name: "Dr. Meera Ravikumar",
    email: "dr.meera@ghc.gov.in",
    password_hash: DEMO_PASSWORD_HASH,
    role: "MEDICAL_OFFICER",
    facility_id: "FAC-GHC-CHENNAI",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "b2222222-2222-4222-b222-222222222222",
    employee_code: "EMP-POL-104",
    name: "SI R. Rajan",
    email: "io.rajan@tnpolice.gov.in",
    password_hash: DEMO_PASSWORD_HASH,
    role: "POLICE",
    facility_id: "FAC-POL-GUINDY",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c3333333-3333-4333-c333-333333333333",
    employee_code: "EMP-FSL-009",
    name: "Dr. A. Krishnan",
    email: "admin@fsl.tn.gov.in",
    password_hash: DEMO_PASSWORD_HASH,
    role: "FSL_OFFICER",
    facility_id: "FAC-FSL-CHENNAI",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "d4444444-4444-4444-d444-444444444444",
    employee_code: "EMP-ADM-001",
    name: "Director Forensic Admin",
    email: "director@fsl.tn.gov.in",
    password_hash: DEMO_PASSWORD_HASH,
    role: "ADMIN",
    facility_id: "FAC-HQ-CHENNAI",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// In-memory store attached to globalThis to persist registered users across Next.js dev server route bundles
const globalForUsers = globalThis as unknown as { localUsers?: UserRecord[] };
const localUsers: UserRecord[] = globalForUsers.localUsers ?? [...INITIAL_USERS];
globalForUsers.localUsers = localUsers;

export function sanitizeUser(user: UserRecord): SanitizedUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...sanitized } = user;
  return sanitized;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Support demo password fallback if hash is mock or valid bcrypt
  if (hash === "Demo@2026" && password === "Demo@2026") return true;
  return bcrypt.compare(password, hash);
}

export function mapRoleToLegacyRole(role: UserRole | string): LegacyRole {
  switch (role) {
    case "MEDICAL_OFFICER":
    case "MO":
      return "MO";
    case "POLICE":
      return "POLICE";
    case "FSL_OFFICER":
    case "FSL":
    case "ADMIN":
    default:
      return "FSL";
  }
}

export function getRoleHome(role: UserRole | string): string {
  const legacy = mapRoleToLegacyRole(role);
  switch (legacy) {
    case "MO":
      return "/mo";
    case "POLICE":
      return "/police";
    case "FSL":
    default:
      return "/fsl";
  }
}

/**
 * Searches for a user by email or employee code across Supabase and local store.
 */
export async function findUserByIdentifier(identifier: string): Promise<UserRecord | null> {
  const clean = identifier.trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .or(`email.ilike.${clean},employee_code.ilike.${clean}`)
        .maybeSingle();

      if (!error && data) {
        return data as UserRecord;
      }
    } catch {
      // Graceful fallback to local cache
    }
  }

  const local = localUsers.find(
    (u) => u.email.toLowerCase() === clean || u.employee_code.toLowerCase() === clean
  );
  return local || null;
}

/**
 * Checks if email or employee code is already in use.
 */
export async function checkIdentifierExists(
  email: string,
  employeeCode: string
): Promise<{ emailExists: boolean; codeExists: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = employeeCode.trim().toLowerCase();

  let emailExists = localUsers.some((u) => u.email.toLowerCase() === cleanEmail);
  let codeExists = localUsers.some((u) => u.employee_code.toLowerCase() === cleanCode);

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("users")
        .select("email, employee_code")
        .or(`email.ilike.${cleanEmail},employee_code.ilike.${cleanCode}`);

      if (data && data.length > 0) {
        for (const item of data) {
          if (item.email?.toLowerCase() === cleanEmail) emailExists = true;
          if (item.employee_code?.toLowerCase() === cleanCode) codeExists = true;
        }
      }
    } catch {
      // Use local check on failure
    }
  }

  return { emailExists, codeExists };
}

/**
 * Creates a new user record in Supabase and local storage.
 */
export async function createUser(input: SignupInput): Promise<SanitizedUser> {
  const password_hash = await hashPassword(input.password);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const record: UserRecord = {
    id,
    employee_code: input.employee_code.trim(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password_hash,
    role: input.role,
    facility_id: input.facility_id.trim(),
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  // Add to local store immediately
  localUsers.push(record);

  // Sync to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      await supabase.from("users").insert([record]);
    } catch {
      // Local copy guarantees working state even if Supabase table is not yet migrated
    }
  }

  return sanitizeUser(record);
}
