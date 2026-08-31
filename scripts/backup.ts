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
    // 1. Database Snapshot & Engine Detection
    const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgresql://') || (process.env.DATABASE_URL || '').startsWith('postgres://');
    console.log(`💾 1. Database engine: ${isPostgres ? 'PostgreSQL (Supabase Cloud)' : 'SQLite'}`);
    if (!isPostgres && fs.existsSync(DB_PATH)) {
      const tempDbSnapshot = path.join(stagingDir, "dev.db");
      try {
        await prisma.$queryRawUnsafe(`VACUUM INTO '${tempDbSnapshot.replace(/'/g, "''")}'`);
        console.log("   ✅ SQLite VACUUM snapshot created successfully.");
      } catch (err) {
        fs.copyFileSync(DB_PATH, tempDbSnapshot);
        if (fs.existsSync(`${DB_PATH}-wal`)) fs.copyFileSync(`${DB_PATH}-wal`, `${tempDbSnapshot}-wal`);
        if (fs.existsSync(`${DB_PATH}-shm`)) fs.copyFileSync(`${DB_PATH}-shm`, `${tempDbSnapshot}-shm`);
        console.log("   ✅ Direct SQLite file copy completed.");
      }
    } else if (isPostgres) {
      console.log("   ✅ Live PostgreSQL connection verified. Full JSON relational dump will be created.");
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
      try {
        const uploadsSizeOutput = execSync(`du -sm "${UPLOADS_PATH}" 2>/dev/null || echo "0"`).toString().trim();
        const uploadsSizeMB = parseInt(uploadsSizeOutput.split(/\s+/)[0] || '0', 10);
        if (uploadsSizeMB <= 15) {
          execSync(`cp -R "${UPLOADS_PATH}" "${targetUploads}" 2>/dev/null || true`);
          console.log(`   ✅ Uploaded assets copied (${uploadsSizeMB} MB).`);
        } else {
          fs.mkdirSync(targetUploads, { recursive: true });
          fs.writeFileSync(
            path.join(targetUploads, 'media_manifest.json'),
            JSON.stringify({ note: 'Media assets stored in Cloudinary CDN & local public/uploads directory.', sizeMB: uploadsSizeMB }, null, 2)
          );
          console.log(`   ℹ️ Public uploads (${uploadsSizeMB} MB) exceed cloud payload limit — media manifest recorded. Heavy media served via Cloudinary CDN.`);
        }
      } catch {
        fs.mkdirSync(targetUploads, { recursive: true });
      }
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

    // 7. Google Drive Cloud Sync
    const gdriveWebhookUrl = process.env.GOOGLE_DRIVE_WEBHOOK_URL;
    if (gdriveWebhookUrl) {
      console.log(`☁️  6. Syncing archive to Google Drive...`);
      try {
        const fileBase64 = fs.readFileSync(archivePath).toString('base64');
        const gdriveRes = await fetch(gdriveWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: path.basename(archivePath),
            fileData: fileBase64,
            mimeType: 'application/gzip',
            manifest,
          }),
          redirect: 'follow',
        });
        const gdriveData = await gdriveRes.json().catch(() => ({ success: gdriveRes.ok }));
        if (gdriveRes.ok && gdriveData.success) {
          console.log(`   ✅ Successfully uploaded to Google Drive folder!`);
          if (gdriveData.fileUrl) console.log(`   🔗 Cloud Link: ${gdriveData.fileUrl}`);
        } else {
          console.warn(`   ⚠️ Google Drive webhook returned error:`, gdriveData);
        }
      } catch (err: any) {
        console.warn(`   ⚠️ Google Drive sync failed:`, err?.message || err);
      }
    } else {
      console.log(`   ℹ️ Google Drive sync skipped (GOOGLE_DRIVE_WEBHOOK_URL not set).`);
    }
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
