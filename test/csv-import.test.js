import { test, expect, describe } from 'bun:test';
import { prisma } from '../src/lib/db/prisma';
import { parseProjectsCSV } from '../src/lib/domain/inventory-csv-parser';

describe('99acres & MahaRERA CSV Import & Anti-Pollution Engine Tests', () => {
  const testReraNew = 'P52000098765';
  const sample99acresCSV = `cardType,Project Name,MahaRERA ID,Builder Name,Micro-Market,Address,Possession Date,Latitude,Longitude,Total Towers,Total Floors,Base Price Per Sqft,Short Description
property,1 BHK in Sector 36,P52000099999,Broker Listing,Kharghar,"Sector 36",2025-12-31,19.0650,73.0800,1,14,11000,"Broker resale listing - should be filtered"
project,Sai World Empire,P52000026796,Paradise Group,Kharghar Sector 36,"Sector 36, Upper Kharghar, Navi Mumbai 410210",2026-12-31,19.0682,73.0845,6,38,15500,"18-Acre French & Roman Themed Luxury Township."
property,2 BHK Luxury Flat,P52000088888,Individual Agent,Taloja,"Sector 11",2026-06-30,19.0700,73.1100,2,16,8000,"Another broker spam listing"
project,Adhiraj Capital City,P52000022975,Adhiraj Constructions,Kharghar Sector 37,"Sector 37, Kharghar, Navi Mumbai 410210",2026-06-30,19.0654,73.0812,5,54,14200,"40-Acre Megacity with 54-Storey High-Rise Towers."
project,Arihant Sports City,${testReraNew},Arihant Superstructures,Taloja Phase 2,"Sector 26, Taloja Phase 2, Navi Mumbai 410208",2027-12-31,19.0550,73.1020,8,36,9900,"Integrated Sports Township with Olympic Amenities."
`;

  test('parseProjectsCSV strictly filters out broker resale spam (cardType: property)', () => {
    const result = parseProjectsCSV(sample99acresCSV, true);

    // 5 total rows, 2 are 'property' (filtered), 3 are 'project' (retained)
    expect(result.totalRows).toBe(5);
    expect(result.filteredOutCount).toBe(2);
    expect(result.projects.length).toBe(3);

    const projectNames = result.projects.map((p) => p.projectName);
    expect(projectNames).toEqual([
      'Sai World Empire',
      'Adhiraj Capital City',
      'Arihant Sports City',
    ]);
  });

  test('parseProjectsCSV accurately extracts and normalizes all fields', () => {
    const result = parseProjectsCSV(sample99acresCSV, true);
    const arihant = result.projects.find((p) => p.projectName === 'Arihant Sports City');

    expect(arihant).toBeDefined();
    expect(arihant?.reraNumber).toBe(testReraNew);
    expect(arihant?.developerName).toBe('Arihant Superstructures');
    expect(arihant?.microMarket).toBe('Taloja Phase 2');
    expect(arihant?.totalTowers).toBe(8);
    expect(arihant?.totalFloors).toBe(36);
    expect(arihant?.basePricePerSqft).toBe(9900);
  });

  test('Deduplication on MahaRERA ID prevents duplicate project creation in database', async () => {
    const org = await prisma.organization.findFirst();
    if (!org) return;

    // Clean up test RERA record if leftover
    await prisma.developerProject.deleteMany({
      where: { reraNumber: testReraNew },
    });

    // Ensure Sai World Empire exists
    const existing = await prisma.developerProject.findFirst({
      where: {
        organizationId: org.id,
        reraNumber: 'P52000026796',
      },
    });
    expect(existing).not.toBeNull();

    const initialCount = await prisma.developerProject.count({
      where: { organizationId: org.id },
    });

    // Parse and simulate importing CSV
    const parseResult = parseProjectsCSV(sample99acresCSV, true);

    for (const item of parseResult.projects) {
      const match = await prisma.developerProject.findFirst({
        where: {
          organizationId: org.id,
          reraNumber: item.reraNumber,
        },
      });

      if (match) {
        // Update existing record
        await prisma.developerProject.update({
          where: { id: match.id },
          data: {
            projectName: item.projectName,
            developerName: item.developerName,
            basePricePerSqft: item.basePricePerSqft,
          },
        });
      } else {
        // Create new
        await prisma.developerProject.create({
          data: {
            organizationId: org.id,
            projectName: item.projectName,
            developerName: item.developerName,
            reraNumber: item.reraNumber,
            microMarket: item.microMarket,
            basePricePerSqft: item.basePricePerSqft || 10000,
          },
        });
      }
    }

    const finalCount = await prisma.developerProject.count({
      where: { organizationId: org.id },
    });

    // Only 1 new project (Arihant Sports City) should have been added; Sai World Empire & Adhiraj were updated
    expect(finalCount).toBe(initialCount + 1);

    // Verify Arihant Sports City was created
    const createdProject = await prisma.developerProject.findFirst({
      where: { reraNumber: testReraNew },
    });
    expect(createdProject).not.toBeNull();
    expect(createdProject?.projectName).toBe('Arihant Sports City');

    // Clean up test record after test
    await prisma.developerProject.deleteMany({
      where: { reraNumber: testReraNew },
    });
  });
});
