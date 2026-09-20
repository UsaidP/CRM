import { PrismaClient } from '@prisma/client';
import { withTenantGuard } from './tenant-guard';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const baseClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = baseClient;

/**
 * Auto-heals missing database columns/tables caused by schema drift
 * between Prisma Client and deployed PostgreSQL databases.
 */
let schemaHealPromise: Promise<void> | null = null;

export function ensureSchemaUpToDate(): Promise<void> {
  if (!schemaHealPromise) {
    schemaHealPromise = (async () => {
      try {
        const statements = [
          `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT`,
          `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT`,
          `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "teamId" TEXT`,
          `ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3)`,
          `ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "confirmedVia" TEXT`,
          `ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3)`,
          `ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "rescheduleCount" INTEGER DEFAULT 0`,
          `ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "noShowReason" TEXT`,
          `ALTER TABLE "DeveloperProject" ADD COLUMN IF NOT EXISTS "plotSizeSqMeters" DOUBLE PRECISION`,
          `ALTER TABLE "DeveloperProject" ADD COLUMN IF NOT EXISTS "plotSizeSqFt" DOUBLE PRECISION`,
          `ALTER TABLE "DeveloperProject" ADD COLUMN IF NOT EXISTS "isReraExempt" BOOLEAN DEFAULT false`,
          `ALTER TABLE "DeveloperProject" ADD COLUMN IF NOT EXISTS "reraStatus" TEXT DEFAULT 'NOT_UPDATED'`,
        ];
        for (const stmt of statements) {
          await baseClient.$executeRawUnsafe(stmt).catch(() => {});
        }
      } catch (err: any) {
        console.warn('[DB] Schema auto-healing notice:', err?.message || err);
      }
    })();
  }
  return schemaHealPromise;
}

/**
 * Tenant-guarded client: every request that goes through `requireSession`
 * has its organization bound, and queries on org-scoped models are
 * auto-scoped to it (see tenant-guard.ts / tenant-context.ts).
 */
export const prisma = withTenantGuard(baseClient);

