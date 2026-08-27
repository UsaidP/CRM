import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "prisma", "dev.db");
const UPLOADS_PATH = path.join(ROOT_DIR, "public", "uploads");
const BACKUPS_DIR = path.join(ROOT_DIR, "backups");

async function runRestore() {
  const targetArchive = process.argv[2];

  if (!targetArchive) {
    console.log("Usage: bun scripts/restore.ts <backup-file-name-or-path>");
    console.log("\nAvailable Backups in backups/ folder:");
    if (fs.existsSync(BACKUPS_DIR)) {
      const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith(".tar.gz"));
      if (files.length === 0) {
        console.log("  (No backup archives found in backups/)");
      } else {
        files.forEach(f => console.log(`  - ${f}`));
      }
    }
    process.exit(1);
  }

  const archivePath = path.isAbsolute(targetArchive)
    ? targetArchive
    : path.join(BACKUPS_DIR, targetArchive);

  if (!fs.existsSync(archivePath)) {
    console.error(`❌ Archive not found: ${archivePath}`);
    process.exit(1);
  }

  console.log(`=======================================================`);
  console.log(`🔄 Restoring ZamZam CRM from: ${path.basename(archivePath)}`);
  console.log(`=======================================================`);

  const tempExtractDir = path.join(BACKUPS_DIR, `restore-temp-${Date.now()}`);
  fs.mkdirSync(tempExtractDir, { recursive: true });

  try {
    // 1. Extract archive
    console.log("📦 1. Extracting archive...");
    execSync(`tar -xzf "${archivePath}" -C "${tempExtractDir}"`);

    // Find extracted folder
    const entries = fs.readdirSync(tempExtractDir);
    const contentDir = entries.length === 1 && fs.statSync(path.join(tempExtractDir, entries[0])).isDirectory()
      ? path.join(tempExtractDir, entries[0])
      : tempExtractDir;

    // 2. Backup current state before restoring
    if (fs.existsSync(DB_PATH)) {
      const safetyBackup = `${DB_PATH}.pre-restore-${Date.now()}`;
      fs.copyFileSync(DB_PATH, safetyBackup);
      console.log(`   🛡️ Safety backup of current database saved to: ${path.basename(safetyBackup)}`);
    }

    // 3. Restore SQLite database
    const extractedDb = path.join(contentDir, "dev.db");
    if (fs.existsSync(extractedDb)) {
      fs.copyFileSync(extractedDb, DB_PATH);
      console.log("   ✅ Database restored to prisma/dev.db");
    } else {
      console.warn("   ⚠️ dev.db not found in archive!");
    }

    // 4. Restore Uploads
    const extractedUploads = path.join(contentDir, "uploads");
    if (fs.existsSync(extractedUploads)) {
      if (!fs.existsSync(UPLOADS_PATH)) fs.mkdirSync(UPLOADS_PATH, { recursive: true });
      execSync(`cp -R "${extractedUploads}/"* "${UPLOADS_PATH}/" 2>/dev/null || true`);
      console.log("   ✅ Uploads restored to public/uploads");
    }

    // Clean up
    fs.rmSync(tempExtractDir, { recursive: true, force: true });

    console.log(`=======================================================`);
    console.log(`🎉 RESTORE COMPLETED SUCCESSFULLY!`);
    console.log(`=======================================================\n`);
  } catch (err) {
    console.error("❌ Restore failed:", err);
    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
    process.exit(1);
  }
}

runRestore();
