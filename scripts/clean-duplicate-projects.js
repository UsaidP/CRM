/**
 * Deduplication & Database Sanitization Script for Developer Projects & Units
 */
import { prisma } from '../src/lib/db/prisma';

async function sanitizeDatabase() {
  console.log('🧹 Scanning database for duplicate projects...');

  const allProjects = await prisma.developerProject.findMany({
    include: { units: true },
    orderBy: { createdAt: 'desc' },
  });

  const seenReras = new Set();
  const seenProjectKeys = new Set();
  let duplicatesRemoved = 0;

  for (const project of allProjects) {
    const reraKey = project.reraNumber.trim().toUpperCase();
    const nameKey = `${project.projectName.trim().toLowerCase()}:::${project.microMarket.trim().toLowerCase()}`;

    if (seenReras.has(reraKey) || seenProjectKeys.has(nameKey)) {
      console.log(`  🗑 Removing duplicate project: "${project.projectName}" (${project.reraNumber}) ID: ${project.id}`);
      await prisma.propertyUnit.deleteMany({ where: { projectId: project.id } });
      await prisma.developerProject.delete({ where: { id: project.id } });
      duplicatesRemoved++;
    } else {
      seenReras.add(reraKey);
      seenProjectKeys.add(nameKey);
    }
  }

  console.log(`✅ Sanitization complete. ${duplicatesRemoved} duplicate project(s) cleaned up.`);
}

sanitizeDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
