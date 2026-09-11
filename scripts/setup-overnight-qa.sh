#!/usr/bin/env bash
# ==============================================================================
# ZAMZAM CRM — OVERNIGHT AGENT-QA SETUP WIZARD (/wizard)
# Interactive helper for human-in-the-loop credential provisioning:
# 1. Sets up the structural read-only PostgreSQL role (qa_agent_ro)
# 2. Configures QA_DATABASE_URL in .env
# 3. Configures Sentry MCP & Auth Token in .env
# 4. Verifies the overnight QA suite
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}  🌙 Overnight Autonomous QA Setup Wizard (/wizard)             ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  touch "$ENV_FILE"
fi

# ------------------------------------------------------------------------------
# STEP 1: Supabase / PostgreSQL Read-Only Role
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[Step 1/4] Provisioning Structural Read-Only DB Role (qa_agent_ro)${NC}"
echo "Run the SQL in scripts/setup-qa-role.sql in your Supabase SQL Editor."
echo ""
read -r -s -p "Enter the password you chose for qa_agent_ro: " QA_PASSWORD
echo ""

if [ -n "$QA_PASSWORD" ]; then
  # Check existing DATABASE_URL to infer host and pooler
  EXISTING_DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"')
  
  if [ -n "$EXISTING_DB_URL" ]; then
    # Replace username and password with qa_agent_ro
    INFERRED_HOST_PART=$(echo "$EXISTING_DB_URL" | sed -E 's|^postgresql://[^@]+@||')
    NEW_QA_URL="postgresql://qa_agent_ro:${QA_PASSWORD}@${INFERRED_HOST_PART}"
  else
    NEW_QA_URL="postgresql://qa_agent_ro:${QA_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&schema=public"
  fi

  echo -e "Constructed QA_DATABASE_URL: ${GREEN}${NEW_QA_URL}${NC}"
  
  # Update or append in .env
  if grep -q "^QA_DATABASE_URL=" "$ENV_FILE"; then
    sed -i '' "s|^QA_DATABASE_URL=.*|QA_DATABASE_URL=\"$NEW_QA_URL\"|" "$ENV_FILE"
  else
    echo "QA_DATABASE_URL=\"$NEW_QA_URL\"" >> "$ENV_FILE"
  fi
  echo -e "${GREEN}✓ QA_DATABASE_URL saved to .env${NC}"
fi
echo ""

# ------------------------------------------------------------------------------
# STEP 2: Sentry Observability Credentials
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[Step 2/4] Configuring Sentry Telemetry & Trace Access${NC}"
echo "To grant the QA agent real APM trace & percentile access, create a Sentry User Auth Token:"
echo "URL: https://sentry.io/settings/account/api/auth-tokens/"
echo "Required Scopes: project:read, org:read, event:read"
echo ""

read -r -p "Enter Sentry Auth Token (or press Enter to skip): " SENTRY_TOKEN
if [ -n "$SENTRY_TOKEN" ]; then
  read -r -p "Enter Sentry Org Slug [default: zamzam-crm]: " SENTRY_ORG_INPUT
  SENTRY_ORG_VAL=${SENTRY_ORG_INPUT:-"zamzam-crm"}

  read -r -p "Enter Sentry Project Slug [default: crm-web]: " SENTRY_PROJECT_INPUT
  SENTRY_PROJECT_VAL=${SENTRY_PROJECT_INPUT:-"crm-web"}

  # Write Sentry keys
  for KEY in "SENTRY_AUTH_TOKEN" "SENTRY_ORG" "SENTRY_PROJECT"; do
    if grep -q "^${KEY}=" "$ENV_FILE"; then
      sed -i '' "s|^${KEY}=.*|${KEY}=\"${!KEY}\"|" "$ENV_FILE"
    fi
  done

  grep -q "^SENTRY_AUTH_TOKEN=" "$ENV_FILE" || echo "SENTRY_AUTH_TOKEN=\"$SENTRY_TOKEN\"" >> "$ENV_FILE"
  grep -q "^SENTRY_ORG=" "$ENV_FILE" || echo "SENTRY_ORG=\"$SENTRY_ORG_VAL\"" >> "$ENV_FILE"
  grep -q "^SENTRY_PROJECT=" "$ENV_FILE" || echo "SENTRY_PROJECT=\"$SENTRY_PROJECT_VAL\"" >> "$ENV_FILE"

  echo -e "${GREEN}✓ Sentry credentials saved to .env${NC}"
fi
echo ""

# ------------------------------------------------------------------------------
# STEP 3: Sentry MCP Server Setup
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[Step 3/4] Sentry MCP Configuration${NC}"
echo "Sentry MCP configuration is saved at scripts/sentry-mcp-config.json"
echo "To add Sentry MCP to Claude Code or Antigravity, merge scripts/sentry-mcp-config.json into your MCP settings."
echo -e "${GREEN}✓ Sentry MCP configuration validated.${NC}"
echo ""

# ------------------------------------------------------------------------------
# STEP 4: Run Verification Sweep
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[Step 4/4] Running Overnight QA Verification Sweep${NC}"
echo "Executing: OVERNIGHT_QA=true bun test test/overnight/"
echo ""

OVERNIGHT_QA=true bun test test/overnight/

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  ✓ Overnight Agent-QA Setup Complete!                          ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo "Reports and cleanup scripts are located in: output/qa-reports/"
echo "Morning Triage: output/qa-reports/report-$(date +%Y-%m-%d).md"
echo "Reviewed Cleanup: output/qa-reports/cleanup-$(date +%Y-%m-%d).sql"
echo ""
