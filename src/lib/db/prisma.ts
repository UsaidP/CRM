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
 * Tenant-guarded client: every request that goes through `requireSession`
 * has its organization bound, and queries on org-scoped models are
 * auto-scoped to it (see tenant-guard.ts / tenant-context.ts).
 */
export const prisma = withTenantGuard(baseClient);
