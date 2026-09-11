import { PrismaClient } from '@prisma/client';

/**
 * Isolated, read-only Prisma Client specifically configured for autonomous QA sweeps.
 *
 * Enforces two distinct layers of structural protection:
 * 1. Application-level: Prisma extension intercepts and blocks all mutation methods (create, update, delete, upsert, raw execution).
 * 2. Database-level: Connects using QA_DATABASE_URL (qa_agent_ro role), where PostgreSQL denies write privileges.
 */

const globalForQaPrisma = globalThis as unknown as {
  qaPrisma: PrismaClient | undefined;
};

const qaDbUrl = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;

if (!qaDbUrl) {
  console.warn('[QA-Prisma] Neither QA_DATABASE_URL nor DATABASE_URL is configured in environment.');
}

const baseQaClient =
  globalForQaPrisma.qaPrisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: qaDbUrl,
      },
    },
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForQaPrisma.qaPrisma = baseQaClient;
}

export const qaPrisma = baseQaClient.$extends({
  query: {
    $allModels: {
      async create() {
        throw new Error('[Structural Guardrail] INSERT operations are strictly forbidden on qaPrisma.');
      },
      async createMany() {
        throw new Error('[Structural Guardrail] INSERT operations are strictly forbidden on qaPrisma.');
      },
      async update() {
        throw new Error('[Structural Guardrail] UPDATE operations are strictly forbidden on qaPrisma.');
      },
      async updateMany() {
        throw new Error('[Structural Guardrail] UPDATE operations are strictly forbidden on qaPrisma.');
      },
      async upsert() {
        throw new Error('[Structural Guardrail] UPSERT operations are strictly forbidden on qaPrisma.');
      },
      async delete() {
        throw new Error('[Structural Guardrail] DELETE operations are strictly forbidden on qaPrisma. Write cleanup to output/qa-reports/cleanup-YYYY-MM-DD.sql instead.');
      },
      async deleteMany() {
        throw new Error('[Structural Guardrail] DELETE operations are strictly forbidden on qaPrisma. Write cleanup to output/qa-reports/cleanup-YYYY-MM-DD.sql instead.');
      },
    },
  },
});
