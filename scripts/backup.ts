import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "prisma", "dev.db");
const UPLOADS_PATH = path.join(ROOT_DIR, "public", "uploads");
const BACKUPS_DIR = path.join(ROOT_DIR, "backups");
const RETENTION_DAYS = 30; // Keep the last 30 daily backups

async function runBackup() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dateStr = new Date().toISOString().slice(0, 10);
  const backupName = `backup-zamzam-crm-${timestamp}`;
  const stagingDir = path.join(BACKUPS_DIR, `temp-${timestamp}`);

  console.log(`=======================================================`);
  console.log(`📦 Starting ZamZam CRM Daily Backup: ${dateStr}`);
  console.log(`=======================================================`);

  // Ensure backups directory exists
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  // Create staging directory
  fs.mkdirSync(stagingDir, { recursive: true });
  const jsonExportDir = path.join(stagingDir, "json_exports");
  fs.mkdirSync(jsonExportDir, { recursive: true });

  try {
    // 1. Safe SQLite Database Snapshot
    console.log("💾 1. Creating consistent SQLite database snapshot...");
    const tempDbSnapshot = path.join(stagingDir, "dev.db");
    
    if (fs.existsSync(DB_PATH)) {
      try {
        // Use SQLite VACUUM INTO for 100% transactional consistency without locking
        await prisma.$queryRawUnsafe(`VACUUM INTO '${tempDbSnapshot.replace(/'/g, "''")}'`);
        console.log("   ✅ SQLite VACUUM snapshot created successfully.");
      } catch (err) {
        console.warn("   ⚠️ VACUUM INTO failed, falling back to direct file copy:", err);
        fs.copyFileSync(DB_PATH, tempDbSnapshot);
        // Also copy wal/shm if present
        if (fs.existsSync(`${DB_PATH}-wal`)) fs.copyFileSync(`${DB_PATH}-wal`, `${tempDbSnapshot}-wal`);
        if (fs.existsSync(`${DB_PATH}-shm`)) fs.copyFileSync(`${DB_PATH}-shm`, `${tempDbSnapshot}-shm`);
        console.log("   ✅ Direct SQLite file copy completed.");
      }
    } else {
      console.warn("   ⚠️ Warning: prisma/dev.db not found!");
    }

    // 2. Export All Tables to Human-Readable JSON for Disaster Recovery
    console.log("📋 2. Exporting CRM tables to portable JSON files...");
    const recordCounts: Record<string, number> = {};

    const [
      organizations,
      users,
      contacts,
      contactIdentities,
      leads,
      buyerRequirements,
      communications,
      projects,
      units,
      campaigns,
      siteVisits,
      deals,
      reminders,
      portals
    ] = await Promise.all([
      prisma.organization.findMany(),
      prisma.user.findMany({ select: { id: true, organizationId: true, fullName: true, email: true, phoneE164: true, role: true, isActive: true, createdAt: true } }),
      prisma.contact.findMany(),
      prisma.contactIdentity.findMany(),
      prisma.lead.findMany(),
      prisma.buyerRequirement.findMany(),
      prisma.communicationLog.findMany(),
      prisma.developerProject.findMany(),
      prisma.propertyUnit.findMany(),
      prisma.inboundCampaign.findMany(),
      prisma.siteVisit.findMany(),
      prisma.dealTransaction.findMany(),
      prisma.leadReminder.findMany(),
      prisma.clientPortal.findMany({ include: { portalUnits: true } })
    ]);

    const exportsMap = {
      organizations,
      users,
      contacts,
      contactIdentities,
      leads,
      buyerRequirements,
      communications,
      projects,
      units,
      campaigns,
      siteVisits,
      deals,
      reminders,
      portals
    };

    for (const [key, data] of Object.entries(exportsMap)) {
      recordCounts[key] = (data as unknown[]).length;
      fs.writeFileSync(path.join(jsonExportDir, `${key}.json`), JSON.stringify(data, null, 2));
    }
    console.log(`   ✅ Exported ${Object.keys(exportsMap).length} tables to JSON.`);

    // 3. Backup Uploads / Media Directory
    console.log("🖼️  3. Backing up public uploads and media assets...");
    const targetUploads = path.join(stagingDir, "uploads");
    if (fs.existsSync(UPLOADS_PATH)) {
      execSync(`cp -R "${UPLOADS_PATH}" "${targetUploads}"`);
      console.log("   ✅ Uploaded assets copied.");
    } else {
      fs.mkdirSync(targetUploads, { recursive: true });
      console.log("   ℹ️ No public/uploads found, created empty placeholder.");
    }

    // 4. Create Backup Manifest Metadata
    const manifest = {
      backupTimestamp: new Date().toISOString(),
      date: dateStr,
      app: "ZamZam Real Estate CRM",
      version: "1.0.0",
      retentionDays: RETENTION_DAYS,
      databaseType: "SQLite",
      recordCounts,
      totalRecords: Object.values(recordCounts).reduce((acc, curr) => acc + curr, 0)
    };
    fs.writeFileSync(path.join(stagingDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    // 5. Compress into tar.gz
    console.log("🗜️  4. Compressing archive...");
    const archivePath = path.join(BACKUPS_DIR, `${backupName}.tar.gz`);
    execSync(`tar -czf "${archivePath}" -C "${BACKUPS_DIR}" "temp-${timestamp}"`);

    // Clean up temporary staging directory
    fs.rmSync(stagingDir, { recursive: true, force: true });

    const archiveStats = fs.statSync(archivePath);
    const archiveSizeMB = (archiveStats.size / (1024 * 1024)).toFixed(2);

    console.log(`   ✅ Archive created: ${path.basename(archivePath)} (${archiveSizeMB} MB)`);

    // 6. Prune Old Backups (Retention Policy)
    console.log(`🧹 5. Checking retention policy (Keeping last ${RETENTION_DAYS} backups)...`);
    const allFiles = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith("backup-zamzam-crm-") && f.endsWith(".tar.gz"))
      .map(f => ({
        name: f,
        path: path.join(BACKUPS_DIR, f),
        time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // newest first

    if (allFiles.length > RETENTION_DAYS) {
      const filesToDelete = allFiles.slice(RETENTION_DAYS);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        console.log(`   🗑️ Deleted old backup: ${file.name}`);
      }
    } else {
      console.log(`   ℹ️ Total stored backups: ${allFiles.length} (Under limit of ${RETENTION_DAYS}).`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=======================================================`);
    console.log(`🎉 BACKUP SUCCESSFUL in ${duration}s!`);
    console.log(`📁 Saved to: ${archivePath}`);
    console.log(`📊 Summary: ${manifest.totalRecords} total records across ${Object.keys(recordCounts).length} tables.`);
    console.log(`=======================================================\n`);

  } catch (error) {
    console.error("❌ Backup failed:", error);
    // Cleanup staging if failed
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBackup();
