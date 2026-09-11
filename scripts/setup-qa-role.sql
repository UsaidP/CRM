-- ==============================================================================
-- ZAMZAM CRM: OVERNIGHT AUTONOMOUS QA READ-ONLY ROLE SETUP
-- Execute this script in your PostgreSQL / Supabase SQL Editor as a superuser.
-- This establishes structural, database-engine level read-only enforcement for
-- the autonomous QA agent. Prompts are wishes; grants are guarantees.
-- ==============================================================================

-- 1. Create dedicated restricted QA user with custom password
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'qa_agent_ro') THEN
    CREATE ROLE qa_agent_ro WITH LOGIN PASSWORD '${QA_AGENT_DB_PASSWORD}';
  END IF;
END
$$;

-- 2. Grant connection and read-only schema usage
GRANT CONNECT ON DATABASE postgres TO qa_agent_ro;
GRANT USAGE ON SCHEMA public TO qa_agent_ro;

-- 3. Grant SELECT on all existing tables in schema public
GRANT SELECT ON ALL TABLES IN SCHEMA public TO qa_agent_ro;

-- 4. Automatically grant SELECT on future tables created by migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO qa_agent_ro;

-- 5. Explicitly REVOKE all write, mutation, sequence, and DDL permissions
REVOKE CREATE ON SCHEMA public FROM qa_agent_ro;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM qa_agent_ro;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM qa_agent_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM qa_agent_ro;

-- 6. Verification Queries: Confirm role permissions
SELECT rolname, rolcanlogin, rolsuper, rolinherit 
FROM pg_roles 
WHERE rolname = 'qa_agent_ro';

SELECT grantee, table_schema, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'qa_agent_ro' 
LIMIT 10;

-- ==============================================================================
-- CONNECTION STRING FORMAT:
-- Add the following to your .env or CI secrets:
-- QA_DATABASE_URL="postgresql://qa_agent_ro:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&schema=public"
-- ==============================================================================
