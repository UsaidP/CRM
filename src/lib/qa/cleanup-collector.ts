import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface SyntheticEntityRecord {
  type: 'lead' | 'contact' | 'project' | 'deal' | 'portal' | 'unit' | 'siteVisit' | 'reminder';
  id: string;
  metadata?: Record<string, any>;
}

class CleanupCollector {
  private records: SyntheticEntityRecord[] = [];

  /**
   * Register a created synthetic entity.
   */
  register(type: SyntheticEntityRecord['type'], id: string, metadata?: Record<string, any>) {
    if (!id) return;
    this.records.push({ type, id, metadata });
  }

  /**
   * Get all registered records.
   */
  getRecords(): SyntheticEntityRecord[] {
    return [...this.records];
  }

  /**
   * Filter IDs by type.
   */
  getIds(type: SyntheticEntityRecord['type']): string[] {
    return this.records.filter((r) => r.type === type).map((r) => r.id);
  }

  /**
   * Whether the process is currently executing in autonomous overnight QA mode.
   */
  isQaMode(): boolean {
    return process.env.OVERNIGHT_QA === 'true';
  }

  /**
   * Format all registered synthetic entities as a reviewed, transaction-wrapped SQL file.
   */
  generateCleanupSql(dateString?: string): string {
    const today = dateString || new Date().toISOString().split('T')[0];
    const deals = this.getIds('deal');
    const portals = this.getIds('portal');
    const leads = this.getIds('lead');
    const contacts = this.getIds('contact');
    const projects = this.getIds('project');
    const units = this.getIds('unit');
    const siteVisits = this.getIds('siteVisit');
    const reminders = this.getIds('reminder');

    const formatInClause = (ids: string[]) => ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(', ');

    const statements: string[] = [];

    statements.push(`-- ==============================================================================`);
    statements.push(`-- Overnight Autonomous QA Cleanup Script — ${today}`);
    statements.push(`-- Generated: ${new Date().toISOString()}`);
    statements.push(`-- REVIEW BEFORE EXECUTING.`);
    statements.push(`-- Structural rule: The QA agent writes cleanup scripts; it never executes deletes.`);
    statements.push(`-- To run manually: psql "$DATABASE_URL" -f cleanup-${today}.sql`);
    statements.push(`-- ==============================================================================\n`);
    statements.push(`BEGIN;\n`);

    if (deals.length > 0) {
      statements.push(`-- Teardown Deal Transactions (${deals.length} records)`);
      statements.push(`DELETE FROM "DealTransaction" WHERE "id" IN (${formatInClause(deals)});\n`);
    }

    if (portals.length > 0) {
      statements.push(`-- Teardown Client Portals & Linked Units (${portals.length} portals)`);
      statements.push(`DELETE FROM "ClientPortalUnit" WHERE "portalId" IN (${formatInClause(portals)});`);
      statements.push(`DELETE FROM "PortalTelemetryLog" WHERE "portalId" IN (${formatInClause(portals)});`);
      statements.push(`DELETE FROM "ClientPortal" WHERE "id" IN (${formatInClause(portals)});\n`);
    }

    if (siteVisits.length > 0) {
      statements.push(`-- Teardown Site Visits (${siteVisits.length} records)`);
      statements.push(`DELETE FROM "SiteVisit" WHERE "id" IN (${formatInClause(siteVisits)});\n`);
    }

    if (reminders.length > 0) {
      statements.push(`-- Teardown Lead Reminders (${reminders.length} records)`);
      statements.push(`DELETE FROM "LeadReminder" WHERE "id" IN (${formatInClause(reminders)});\n`);
    }

    if (leads.length > 0) {
      statements.push(`-- Teardown Leads & Dependents (${leads.length} leads)`);
      statements.push(`DELETE FROM "LeadAssignment" WHERE "leadId" IN (${formatInClause(leads)});`);
      statements.push(`DELETE FROM "LeadReminder" WHERE "leadId" IN (${formatInClause(leads)});`);
      statements.push(`DELETE FROM "CommunicationLog" WHERE "leadId" IN (${formatInClause(leads)});`);
      statements.push(`DELETE FROM "BuyerRequirement" WHERE "leadId" IN (${formatInClause(leads)});`);
      statements.push(`DELETE FROM "SiteVisit" WHERE "leadId" IN (${formatInClause(leads)});`);
      statements.push(`DELETE FROM "DealTransaction" WHERE "leadId" IN (${formatInClause(leads)});`);
      statements.push(`DELETE FROM "Lead" WHERE "id" IN (${formatInClause(leads)});\n`);
    }

    if (contacts.length > 0) {
      statements.push(`-- Teardown Contacts & Identities (${contacts.length} contacts)`);
      statements.push(`DELETE FROM "ContactIdentity" WHERE "contactId" IN (${formatInClause(contacts)});`);
      statements.push(`DELETE FROM "ContactMergeAudit" WHERE "sourceContactId" IN (${formatInClause(contacts)}) OR "targetContactId" IN (${formatInClause(contacts)});`);
      statements.push(`DELETE FROM "Contact" WHERE "id" IN (${formatInClause(contacts)});\n`);
    }

    if (units.length > 0) {
      statements.push(`-- Teardown Property Units (${units.length} units)`);
      statements.push(`DELETE FROM "InventoryAuditLog" WHERE "propertyUnitId" IN (${formatInClause(units)});`);
      statements.push(`DELETE FROM "PropertyUnit" WHERE "id" IN (${formatInClause(units)});\n`);
    }

    if (projects.length > 0) {
      statements.push(`-- Teardown Developer Projects (${projects.length} projects)`);
      statements.push(`DELETE FROM "DeveloperProject" WHERE "id" IN (${formatInClause(projects)});\n`);
    }

    // Safety matchers for test prefixes
    statements.push(`-- General Safety Catch: purge synthetic emails and test-specific names if not caught by ID`);
    statements.push(`DELETE FROM "Lead" WHERE "email" LIKE '%@zamzam-test.internal';`);
    statements.push(`DELETE FROM "DeveloperProject" WHERE "projectName" LIKE '%Test Automation%';\n`);

    statements.push(`COMMIT;\n`);

    return statements.join('\n');
  }

  /**
   * Persists the generated cleanup script to disk.
   */
  saveCleanupScript(targetDirectory?: string, dateString?: string): string {
    const today = dateString || new Date().toISOString().split('T')[0];
    const outDir = targetDirectory || join(process.cwd(), 'output', 'qa-reports');

    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    const filepath = join(outDir, `cleanup-${today}.sql`);
    writeFileSync(filepath, this.generateCleanupSql(today), 'utf8');
    return filepath;
  }

  /**
   * Reset the in-memory collector.
   */
  reset() {
    this.records = [];
  }
}

export const cleanupCollector = new CleanupCollector();
