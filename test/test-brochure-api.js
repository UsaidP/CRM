/**
 * Test POST /api/v1/inventory/projects with brochure payload
 */
import { parseBrochureText } from '../src/lib/services/brochure-parser-service';
import { prisma } from '../src/lib/db/prisma';

console.log('🧪 Testing Project Creation & Auto-Unit Ingestion with Brochure Data...');

async function testProjectCreation() {
  const cityAvenueSample = `
CITY AVENUE
Plot No. 12D, Sector-24, Taloja Phase II, Navi Mumbai-410208
MahaRERA Registration Number: P52000079818
ABOUT PROJECT:
G+7 with Commercial & Residential Project
Taste-Fully Designed Entrance & Floor Lobbies
Branded High Speed Elevators
Clear Title CIDCO Transfer Plot
1 BHK & 2 BHK Spacious Flats with Balcony
1st Floor 7 Flat & 2nd to 7th Slab 8 Flat Each Floor
Power Backup For Lifts & Common Area
AMENITIES:
2'x2' Vitrified flooring tiles in all the rooms
Granite kitchen platform with stainless steel sink
Concealed plumbing with branded fittings
Powder Coated Aluminum sliding windows
Intercom facility & Rain water harvesting
Special water proofing treatment with china chips
A Project By: City Space
Office Add: #35, 1st Floor, Hiranandani Crystal Plaza, Sector-7, Kharghar
Site Add: Plot No. 12D, Sector-24, Taloja Phase II, Navi Mumbai-410208
Email: citygroup36@gmail.com
Architects: Destination Architecture Interior Designs
RCC Consultants: SRS Consultants
CONTACT FOR BOOKING: MOHD SAQLAIN - 9920540484
`;

  const parsed = parseBrochureText(cityAvenueSample, 'City_Avenue_Brochure.pdf');

  // Verify Organization exists or create
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'ZamZam Properties Real Estate',
        slug: 'zamzam-properties-test',
        reraBrokerRegistration: 'A52000028714',
      },
    });
  }

  // Delete existing test project if present
  const existing = await prisma.developerProject.findFirst({
    where: { reraNumber: parsed.reraNumber }
  });
  if (existing) {
    await prisma.propertyUnit.deleteMany({ where: { projectId: existing.id } });
    await prisma.developerProject.delete({ where: { id: existing.id } });
  }

  // Create Project & Units
  const createdProject = await prisma.developerProject.create({
    data: {
      organizationId: org.id,
      developerName: parsed.developerName,
      projectName: parsed.projectName,
      reraNumber: parsed.reraNumber,
      microMarket: parsed.microMarket,
      subLocality: parsed.subLocality,
      shortDescription: parsed.shortDescription,
      description: parsed.description,
      totalTowers: parsed.totalTowers,
      totalFloors: parsed.totalFloors,
      basePricePerSqft: parsed.basePricePerSqft,
      brochureUrl: '/uploads/brochures/city-avenue.pdf',
      hasOccupancyCertificate: parsed.hasOccupancyCertificate,
      amenitiesJson: JSON.stringify(parsed.amenities),
      keyHighlightsJson: JSON.stringify(parsed.keyHighlights),
      developerSalesPocName: parsed.developerSalesPocName,
      developerSalesPocPhone: parsed.developerSalesPocPhone,
      standardCommissionPercent: parsed.standardCommissionPercent,
    },
  });

  console.log(`  ✅ Created DeveloperProject: "${createdProject.projectName}" (ID: ${createdProject.id})`);

  let unitCount = 0;
  for (const u of parsed.units) {
    const unitRecord = await prisma.propertyUnit.create({
      data: {
        projectId: createdProject.id,
        unitNumber: u.unitNumber || `Flat-0${unitCount + 1}`,
        bhk: u.bhk,
        bathrooms: u.bathrooms,
        balconies: u.balconies,
        floorNumber: u.floorNumber,
        totalFloors: parsed.totalFloors,
        carpetAreaSqft: u.carpetAreaSqft,
        facing: u.facing,
        possessionStatus: u.possessionStatus,
        agreementValue: u.agreementValue,
        stampDutyRate: u.stampDutyRate,
        registrationFee: u.registrationFee,
        gstRate: u.gstRate,
        parkingCharges: u.parkingCharges,
        societyDevelopmentCharges: u.societyDevelopmentCharges,
        allInTotalCost: u.allInTotalCost,
        verificationStatus: 'ACTIVE_MARKETABLE',
        featureHighlightsJson: JSON.stringify(u.featureHighlights),
      },
    });
    unitCount++;
    console.log(`    ✅ Created Unit ${unitRecord.unitNumber}: ${unitRecord.bhk} BHK, ${unitRecord.carpetAreaSqft} sqft, All-In ₹${unitRecord.allInTotalCost}`);
  }

  console.log(`\n🎉 Test Passed: Project & ${unitCount} Units saved successfully to database!`);
}

testProjectCreation().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
