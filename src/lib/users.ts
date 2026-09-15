import type { UserAccount } from "./types";

export const DEMO_PASSWORD = "Demo@2026";

export const SEED_USERS: UserAccount[] = [
  {
    id: "u-mo-1",
    email: "dr.meera@ghc.gov.in",
    password: DEMO_PASSWORD,
    role: "MO",
    name: "Dr. Meera Ravikumar",
    org: "Govt. Hospital, Chennai",
  },
  {
    id: "u-police-1",
    email: "io.rajan@tnpolice.gov.in",
    password: DEMO_PASSWORD,
    role: "POLICE",
    name: "SI R. Rajan",
    org: "Guindy Police Station",
  },
  {
    id: "u-fsl-1",
    email: "admin@fsl.tn.gov.in",
    password: DEMO_PASSWORD,
    role: "FSL",
    name: "Dr. A. Krishnan",
    org: "Regional FSL Chennai",
  },
  {
    id: "u-adm-1",
    email: "director@fsl.tn.gov.in",
    password: DEMO_PASSWORD,
    role: "FSL",
    name: "Director Forensic Admin",
    org: "Regional FSL Chennai",
  },
];

export function findUser(email: string, password: string): UserAccount | null {
  const user = SEED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) return null;
  return user;
}

export const ROLE_HOME: Record<string, string> = {
  MO: "/mo",
  POLICE: "/police",
  FSL: "/fsl",
  MEDICAL_OFFICER: "/mo",
  FSL_OFFICER: "/fsl",
  ADMIN: "/fsl",
};

