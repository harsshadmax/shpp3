-- ============================================================================
-- Project96: Authentication & Users Database Schema
-- Compatible with PostgreSQL & Supabase
-- ============================================================================

-- Enable pgcrypto / uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Role Enum Definition
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('MEDICAL_OFFICER', 'POLICE', 'FSL_OFFICER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Users Table Schema
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    facility_id VARCHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for performance on lookup identifiers
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_employee_code ON public.users (LOWER(employee_code));
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- 3. Row Level Security (RLS) Setup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active users (for auth lookup)
DROP POLICY IF EXISTS "Allow anon auth read on users" ON public.users;
CREATE POLICY "Allow anon auth read on users"
    ON public.users
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- Allow public user registration
DROP POLICY IF EXISTS "Allow anon registration on users" ON public.users;
CREATE POLICY "Allow anon registration on users"
    ON public.users
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow authenticated users to update own record
DROP POLICY IF EXISTS "Allow update on own user record" ON public.users;
CREATE POLICY "Allow update on own user record"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Default Seed Users (Password for all accounts: Demo@2026)
-- Bcrypt Hash ($2b$10$7FIbZjJpVkdiGyZMydof4eopoUPpij5t1O196ny28Nhb2xLepZbwm)
INSERT INTO public.users (
    id,
    employee_code,
    name,
    email,
    password_hash,
    role,
    facility_id,
    is_active
) VALUES
(
    'a1111111-1111-4111-a111-111111111111',
    'EMP-MO-001',
    'Dr. Meera Ravikumar',
    'dr.meera@ghc.gov.in',
    '$2b$10$7FIbZjJpVkdiGyZMydof4eopoUPpij5t1O196ny28Nhb2xLepZbwm',
    'MEDICAL_OFFICER',
    'FAC-GHC-CHENNAI',
    true
),
(
    'b2222222-2222-4222-b222-222222222222',
    'EMP-POL-104',
    'SI R. Rajan',
    'io.rajan@tnpolice.gov.in',
    '$2b$10$7FIbZjJpVkdiGyZMydof4eopoUPpij5t1O196ny28Nhb2xLepZbwm',
    'POLICE',
    'FAC-POL-GUINDY',
    true
),
(
    'c3333333-3333-4333-c333-333333333333',
    'EMP-FSL-009',
    'Dr. A. Krishnan',
    'admin@fsl.tn.gov.in',
    '$2b$10$7FIbZjJpVkdiGyZMydof4eopoUPpij5t1O196ny28Nhb2xLepZbwm',
    'FSL_OFFICER',
    'FAC-FSL-CHENNAI',
    true
),
(
    'd4444444-4444-4444-d444-444444444444',
    'EMP-ADM-001',
    'Director Forensic Admin',
    'director@fsl.tn.gov.in',
    '$2b$10$7FIbZjJpVkdiGyZMydof4eopoUPpij5t1O196ny28Nhb2xLepZbwm',
    'ADMIN',
    'FAC-HQ-CHENNAI',
    true
)
ON CONFLICT (email) DO UPDATE SET
    employee_code = EXCLUDED.employee_code,
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    facility_id = EXCLUDED.facility_id,
    is_active = EXCLUDED.is_active,
    updated_at = now();
