/**
 * Cloud Media & Brochure Elevation / Floor Plan Extraction Test Suite
 */

const { uploadMediaAsset, uploadToLocalStorage, isCloudinaryConfigured, getOptimizedImageUrl } = require('../src/lib/services/cloud-media-service');
const { extractAndProcessBrochure } = require('../src/lib/services/brochure-extractor');
const { prisma } = require('../src/lib/db/prisma');

async function runTests() {
  console.log('🧪 Running Suite: Cloud Media & Brochure Elevation / Floor Plan Extraction Tests\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Test Local Media Storage & Fallback
  try {
    const dummyBuffer = Buffer.from('<svg><text>Elevation Test</text></svg>', 'utf-8');
    const asset = await uploadToLocalStorage(dummyBuffer, 'test_elevation.svg', 'elevations', 'image/svg+xml');
    
    assert(asset.url.includes('/uploads/elevations/'), 'Local media asset stored in /uploads/elevations/ path');
    assert(asset.category === 'elevations', 'Category correctly assigned to elevations');
    assert(asset.fileSizeBytes > 0, 'File size computed accurately');
  } catch (err) {
    assert(false, `Local media asset upload failed: ${err.message}`);
  }

  // 2. Test Cloudinary URL Transformer
  try {
    const rawCloudUrl = 'https://res.cloudinary.com/zamzam/image/upload/v12345/crown_heights_elevation.jpg';
    const transformed = getOptimizedImageUrl(rawCloudUrl, { width: 800, height: 600, crop: 'fill' });
    
    assert(transformed.includes('f_auto,q_auto,w_800,h_600,c_fill'), 'Cloudinary responsive transformation injected properly');
  } catch (err) {
    assert(false, `Cloudinary transformation failed: ${err.message}`);
  }

  // 3. Test Brochure Elevation & Floor Plan Extractor
  try {
    // Find or create test project
    let project = await prisma.developerProject.findFirst({
      include: { units: true }
    });

    if (!project) {
      const org = await prisma.organization.findFirst();
      project = await prisma.developerProject.create({
        data: {
          organizationId: org.id,
          developerName: 'City Space Developers',
          projectName: 'City Avenue Taloja',
          reraNumber: 'P52000079818',
          microMarket: 'Taloja Phase 2',
          basePricePerSqft: 6500,
          totalFloors: 14,
          totalTowers: 2,
        },
        include: { units: true }
      });
    }

    // Test with image file format (PNG / WEBP)
    const pngImageBuffer = Buffer.from('<svg><text>PNG Floorplan</text></svg>', 'utf-8');
    const imageExtraction = await extractAndProcessBrochure(pngImageBuffer, 'Crown_Heights_Elevation.png', {
      projectId: project.id,
      projectName: 'Crown Heights',
      developerName: 'Balaji Developers',
      reraNumber: 'P52000028714',
      totalFloors: 24,
      microMarket: 'Kharghar Sector 35',
      confidentialBrokerData: {
        developerSalesPocName: 'Rajesh Sharma',
        developerSalesPocPhone: '+919820011223',
        developerEmail: 'sales@cityspace.com',
        siteAddress: 'Sector 24, Taloja Phase 2',
        brokerShieldActive: true,
      },
    });

    assert(imageExtraction.elevations.length >= 1, 'Universal extraction processes PNG/Image format into elevations');
    assert(imageExtraction.brochureAsset?.mimeType === 'image/png', 'Image MIME type properly identified as image/png');
    assert(imageExtraction.confidentialBrokerData?.brokerShieldActive === true, 'Broker Shield flag active on confidential builder data');
    assert(imageExtraction.confidentialBrokerData?.developerSalesPocPhone === '+919820011223', 'Direct developer phone secured in internal broker vault');

    // Verify DB update
    const updatedProj = await prisma.developerProject.findUnique({
      where: { id: project.id }
    });

    assert(!!updatedProj.coverImageUrl, 'Project coverImageUrl updated with extracted elevation');
    assert(!!updatedProj.brochureUrl, 'Project brochureUrl updated with extracted brochure');
    assert(!!updatedProj.elevationImagesJson, 'Project elevationImagesJson updated with structured elevations');
  } catch (err) {
    assert(false, `Brochure extraction failed: ${err.message}`);
  }

  console.log('\n================================');
  console.log(`Cloud Media & Brochure Extraction Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
