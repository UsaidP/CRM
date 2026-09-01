-- ==============================================================================
-- ZAMZAM CRM: OVERNIGHT AUTONOMOUS QA READ-ONLY ROLE SETUP
-- Execute this script in your PostgreSQL / Supabase SQL Editor to establish
-- structural read-only permissions for the autonomous QA agent.
-- ==============================================================================

-- 1. Create dedicated restricted QA user
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

-- 3. Grant SELECT on all existing and future tables in schema public
GRANT SELECT ON ALL TABLES IN SCHEMA public TO qa_agent_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO qa_agent_ro;

-- 4. Explicitly REVOKE all write, sequence mutation, and DDL permissions
REVOKE CREATE ON SCHEMA public FROM qa_agent_ro;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM qa_agent_ro;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM qa_agent_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM qa_agent_ro;

-- 5. Confirmation query
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname = 'qa_agent_ro';
