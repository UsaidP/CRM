-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_organizationId_createdAt_idx" ON "Lead"("organizationId", "createdAt");
