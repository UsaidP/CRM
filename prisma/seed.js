const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Comprehensive ZamZam Properties Real Estate CRM Seed (All 7 Phases)...');

  // 1. Clean existing records in reverse dependency order
  await prisma.portalTelemetryLog.deleteMany({});
  await prisma.clientPortalUnit.deleteMany({});
  await prisma.clientPortal.deleteMany({});
  await prisma.dealTransaction.deleteMany({});
  await prisma.siteVisit.deleteMany({});
  await prisma.communicationLog.deleteMany({});
  await prisma.buyerRequirement.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.inboundCampaign.deleteMany({});
  await prisma.webhookEventInbox.deleteMany({});
  await prisma.inventoryAuditLog.deleteMany({});
  await prisma.propertyUnit.deleteMany({});
  await prisma.developerProject.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  // 2. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'ZamZam Properties Real Estate Advisory',
      slug: 'zamzam-properties',
      reraBrokerRegistration: 'A52000029381',
      settingsJson: JSON.stringify({
        state: 'Maharashtra',
        currency: 'INR',
        primaryCity: 'Navi Mumbai',
        activeMicroMarkets: [
          'Kharghar Sector 35',
          'Kharghar Sector 36',
          'Kharghar Sector 20',
          'Taloja Phase 1',
          'Taloja Phase 2',
        ],
      }),
    },
  });

  // 3. Create Staff Users & Brokers
  const adminUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      fullName: 'Usaid Patel',
      email: 'usaid@zamzamproperties.in',
      phoneE164: '+919820123456',
      role: 'SUPER_ADMIN',
    },
  });

  const brokerFarhan = await prisma.user.create({
    data: {
      organizationId: org.id,
      fullName: 'Farhan Shaikh',
      email: 'farhan@zamzamproperties.in',
      phoneE164: '+919820654321',
      role: 'BROKER_MANAGER',
    },
  });

  const brokerSalman = await prisma.user.create({
    data: {
      organizationId: org.id,
      fullName: 'Salman Khan',
      email: 'salman@zamzamproperties.in',
      phoneE164: '+919820778899',
      role: 'SALES_EXECUTIVE',
    },
  });

  const telecallerAisha = await prisma.user.create({
    data: {
      organizationId: org.id,
      fullName: 'Aisha Merchant',
      email: 'aisha@zamzamproperties.in',
      phoneE164: '+919820112233',
      role: 'TELECALLER',
    },
  });

  // 4. Create Developer Projects across Navi Mumbai Micro-Markets
  const projectCrown = await prisma.developerProject.create({
    data: {
      organizationId: org.id,
      developerName: 'Crown Lifespaces',
      projectName: 'Crown Heights Luxury Towers',
      reraNumber: 'P52000018920',
      microMarket: 'Kharghar Sector 35',
      subLocality: 'Upper Kharghar Valley Road',
      latitude: 19.0582,
      longitude: 73.0821,
      distanceToMetroKm: 0.45,
      hasOccupancyCertificate: true,
      commencementCertificateDate: new Date('2021-03-15'),
      expectedPossessionDate: new Date('2024-06-01'),
      totalTowers: 2,
      totalFloors: 22,
      basePricePerSqft: 14850,
      brochureUrl: 'https://zamzamproperties.in/brochures/crown-heights-sec35.pdf',
      youtubeWalkthroughUrl: 'https://youtube.com/watch?v=sample-crown-heights',
      masterPlanUrl: 'https://zamzamproperties.in/plans/crown-heights-master.jpg',
      amenitiesJson: JSON.stringify(['Clubhouse', 'Swimming Pool', 'Gymnasium', 'Landscaped Garden', 'Intercom', 'High-Speed Elevators']),
      developerSalesPocName: 'Vikram Joshi (VP Sales)',
      developerSalesPocPhone: '+919819001122',
      standardCommissionPercent: 2.5,
    },
  });

  const projectSaiMarvel = await prisma.developerProject.create({
    data: {
      organizationId: org.id,
      developerName: 'Sai Developers',
      projectName: 'Sai Marvel Heights',
      reraNumber: 'P52000021450',
      microMarket: 'Kharghar Sector 35',
      subLocality: 'Near Metro Station',
      latitude: 19.061,
      longitude: 73.085,
      distanceToMetroKm: 0.35,
      hasOccupancyCertificate: false,
      commencementCertificateDate: new Date('2022-08-01'),
      expectedPossessionDate: new Date('2025-12-31'),
      totalTowers: 1,
      totalFloors: 18,
      basePricePerSqft: 13500,
      brochureUrl: 'https://zamzamproperties.in/brochures/sai-marvel-sec35.pdf',
      youtubeWalkthroughUrl: 'https://youtube.com/watch?v=sample-sai-marvel',
      masterPlanUrl: 'https://zamzamproperties.in/plans/sai-marvel-master.jpg',
      amenitiesJson: JSON.stringify(['Grand Lobby', 'Rooftop Lounge', 'Kids Play Area', '24x7 Security', 'Fire Fighting System']),
      developerSalesPocName: 'Anil Rathore',
      developerSalesPocPhone: '+919820334455',
      standardCommissionPercent: 3.0,
    },
  });

  const projectGalaxyTaloja = await prisma.developerProject.create({
    data: {
      organizationId: org.id,
      developerName: 'Galaxy Builders',
      projectName: 'Galaxy Metro Heights',
      reraNumber: 'P52000030110',
      microMarket: 'Taloja Phase 1',
      subLocality: 'Taloja Metro Terminal Road',
      latitude: 19.074,
      longitude: 73.098,
      distanceToMetroKm: 0.25,
      hasOccupancyCertificate: false,
      commencementCertificateDate: new Date('2023-01-10'),
      expectedPossessionDate: new Date('2026-06-30'),
      totalTowers: 3,
      totalFloors: 16,
      basePricePerSqft: 7600,
      brochureUrl: 'https://zamzamproperties.in/brochures/galaxy-metro-taloja.pdf',
      youtubeWalkthroughUrl: 'https://youtube.com/watch?v=sample-galaxy-taloja',
      masterPlanUrl: 'https://zamzamproperties.in/plans/galaxy-master.jpg',
      amenitiesJson: JSON.stringify(['Podium Parking', 'Jogging Track', 'Badminton Court', 'Solar Water Heating']),
      developerSalesPocName: 'Pradeep Mehra',
      developerSalesPocPhone: '+919820556677',
      standardCommissionPercent: 3.0,
    },
  });

  const projectParadiseKharghar = await prisma.developerProject.create({
    data: {
      organizationId: org.id,
      developerName: 'Paradise Group',
      projectName: 'Sai Paradise Heights',
      reraNumber: 'P52000015600',
      microMarket: 'Kharghar Sector 20',
      subLocality: 'Central Park Boulevard',
      latitude: 19.045,
      longitude: 73.071,
      distanceToMetroKm: 1.1,
      hasOccupancyCertificate: true,
      commencementCertificateDate: new Date('2020-01-15'),
      expectedPossessionDate: new Date('2023-11-01'),
      totalTowers: 2,
      totalFloors: 19,
      basePricePerSqft: 17500,
      brochureUrl: 'https://zamzamproperties.in/brochures/sai-paradise-sec20.pdf',
      youtubeWalkthroughUrl: 'https://youtube.com/watch?v=sample-sai-paradise',
      masterPlanUrl: 'https://zamzamproperties.in/plans/paradise-master.jpg',
      amenitiesJson: JSON.stringify(['Olympic Size Pool', 'Tennis Court', 'Banquet Hall', 'Spa & Sauna', 'EV Charging']),
      developerSalesPocName: 'Rajesh Nair',
      developerSalesPocPhone: '+919833445566',
      standardCommissionPercent: 2.0,
    },
  });

  // 5. Create Property Units
  const unitsData = [
    // Crown Heights (Kharghar 35)
    {
      projectId: projectCrown.id,
      unitNumber: 'A-1204',
      bhk: 2,
      bathrooms: 2,
      balconies: 2,
      floorNumber: 12,
      totalFloors: 22,
      carpetAreaSqft: 685,
      facing: 'EAST',
      possessionStatus: 'READY_TO_MOVE',
      agreementValue: 6800000,
      stampDutyRate: 6.0,
      registrationFee: 30000,
      gstRate: 0.0, // OC Received
      floorRiseCharges: 274000,
      parkingCharges: 250000,
      societyDevelopmentCharges: 150000,
      allInTotalCost: 7912000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: adminUser.id,
      lastVerifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (Fresh)
      verificationNotes: 'Physically inspected sample unit. Clean valley views, OC clear.',
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
      ]),
      videoReelUrl: 'https://youtube.com/shorts/sample-crown-1204',
      isHotDeal: true,
      isExclusive: true,
    },
    {
      projectId: projectCrown.id,
      unitNumber: 'B-1802',
      bhk: 3,
      bathrooms: 3,
      balconies: 3,
      floorNumber: 18,
      totalFloors: 22,
      carpetAreaSqft: 980,
      facing: 'NORTH_EAST',
      possessionStatus: 'READY_TO_MOVE',
      agreementValue: 10500000,
      stampDutyRate: 6.0,
      registrationFee: 30000,
      gstRate: 0.0,
      floorRiseCharges: 686000,
      parkingCharges: 300000,
      societyDevelopmentCharges: 200000,
      allInTotalCost: 12346000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: adminUser.id,
      lastVerifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      verificationNotes: 'High-floor 3BHK with 2 covered car parks. Developer keys with ZamZam desk.',
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200',
        'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1200',
      ]),
      isHotDeal: false,
      isExclusive: true,
    },
    // Sai Marvel (Kharghar 35 - UC)
    {
      projectId: projectSaiMarvel.id,
      unitNumber: 'M-703',
      bhk: 2,
      bathrooms: 2,
      balconies: 1,
      floorNumber: 7,
      totalFloors: 18,
      carpetAreaSqft: 640,
      facing: 'WEST',
      possessionStatus: 'UNDER_CONSTRUCTION',
      possessionDate: new Date('2025-12-31'),
      agreementValue: 5600000,
      stampDutyRate: 6.0,
      registrationFee: 30000,
      gstRate: 5.0, // 5% GST UC
      floorRiseCharges: 96000,
      parkingCharges: 250000,
      societyDevelopmentCharges: 150000,
      allInTotalCost: 6742000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: brokerFarhan.id,
      lastVerifiedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      verificationNotes: 'Slab 14 casting in progress. Sample flat ready for inspection.',
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
      ]),
      isHotDeal: true,
      isExclusive: false,
    },
    // Galaxy Metro (Taloja 1 - UC Affordable)
    {
      projectId: projectGalaxyTaloja.id,
      unitNumber: 'T1-402',
      bhk: 1,
      bathrooms: 1,
      balconies: 1,
      floorNumber: 4,
      totalFloors: 16,
      carpetAreaSqft: 420,
      facing: 'EAST',
      possessionStatus: 'UNDER_CONSTRUCTION',
      possessionDate: new Date('2026-06-30'),
      agreementValue: 3200000,
      stampDutyRate: 6.0,
      registrationFee: 30000,
      gstRate: 5.0,
      floorRiseCharges: 0,
      parkingCharges: 150000,
      societyDevelopmentCharges: 100000,
      allInTotalCost: 3832000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: brokerSalman.id,
      lastVerifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      verificationNotes: 'Ideal first-time home buyer or investor. 250m to Metro terminal.',
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
      ]),
      isHotDeal: true,
      isExclusive: false,
    },
    {
      projectId: projectGalaxyTaloja.id,
      unitNumber: 'T2-905',
      bhk: 2,
      bathrooms: 2,
      balconies: 1,
      floorNumber: 9,
      totalFloors: 16,
      carpetAreaSqft: 610,
      facing: 'EAST',
      possessionStatus: 'UNDER_CONSTRUCTION',
      possessionDate: new Date('2026-06-30'),
      agreementValue: 4650000,
      stampDutyRate: 6.0,
      registrationFee: 30000,
      gstRate: 5.0,
      floorRiseCharges: 152500,
      parkingCharges: 150000,
      societyDevelopmentCharges: 100000,
      allInTotalCost: 5594000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: brokerSalman.id,
      lastVerifiedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      verificationNotes: 'Middle floor 2BHK with open highway view.',
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
      ]),
      isHotDeal: false,
      isExclusive: false,
    },
    // Sai Paradise (Kharghar 20 - Core Resale / RTM)
    {
      projectId: projectParadiseKharghar.id,
      unitNumber: 'P-1101',
      bhk: 2,
      bathrooms: 2,
      balconies: 2,
      floorNumber: 11,
      totalFloors: 19,
      carpetAreaSqft: 720,
      facing: 'NORTH_EAST',
      possessionStatus: 'READY_TO_MOVE',
      agreementValue: 8800000,
      stampDutyRate: 6.0,
      registrationFee: 30000,
      gstRate: 0.0,
      floorRiseCharges: 252000,
      parkingCharges: 300000,
      societyDevelopmentCharges: 200000,
      allInTotalCost: 10110000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: adminUser.id,
      lastVerifiedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      verificationNotes: 'Prime Kharghar Sector 20. Walking distance to Central Park and Golf Course.',
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=1200',
      ]),
      isHotDeal: false,
      isExclusive: true,
    },
  ];

  const createdUnits = [];
  for (const u of unitsData) {
    const unit = await prisma.propertyUnit.create({ data: u });
    createdUnits.push(unit);
  }

  // 6. Inbound Campaigns (YouTube, Instagram, FB, WhatsApp)
  const campaignYtShort = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'YouTube Short #YT-TALOJA-01 (Galaxy Metro)',
      channelType: 'YOUTUBE_SHORT',
      contentId: 'yt-short-taloja-01',
      targetProjectId: projectGalaxyTaloja.id,
      targetPropertyUnitId: createdUnits[3].id,
      customSlug: 'yt-taloja-affordable',
      waPrefilledText: 'Hi ZamZam Properties, saw your YouTube Short #YT-TALOJA-01 for Galaxy Metro Heights 1BHK. Please share verified price.',
      totalClicks: 420,
      totalLeadsGenerated: 28,
      isActive: true,
    },
  });

  const campaignYtReview = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'YouTube Review #YT-CROWN-SEC35 (Crown Heights 2BHK)',
      channelType: 'YOUTUBE_VIDEO',
      contentId: 'yt-crown-sec35-review',
      targetProjectId: projectCrown.id,
      targetPropertyUnitId: createdUnits[0].id,
      customSlug: 'yt-crown-sec35',
      waPrefilledText: 'Hi ZamZam Properties, watched your full YouTube walkthrough of Crown Heights Kharghar Sector 35. Looking for 2BHK ready possession.',
      totalClicks: 850,
      totalLeadsGenerated: 45,
      isActive: true,
    },
  });

  const campaignIgReel = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'Instagram Reel #IG-SAI-MARVEL (Under-Construction 2BHK)',
      channelType: 'INSTAGRAM_REEL',
      contentId: 'reel-sai-marvel-01',
      targetProjectId: projectSaiMarvel.id,
      targetPropertyUnitId: createdUnits[2].id,
      customSlug: 'ig-sai-marvel',
      waPrefilledText: 'Hi ZamZam, saw your Reel on Sai Marvel 2BHK. Need all-in cost breakdown with loan details.',
      totalClicks: 620,
      totalLeadsGenerated: 34,
      isActive: true,
    },
  });

  const campaignFbGroup = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'Facebook Group: Navi Mumbai Property Investors Forum',
      channelType: 'FB_GROUP',
      contentId: 'fb-group-kharghar-inv',
      targetProjectId: projectParadiseKharghar.id,
      targetPropertyUnitId: createdUnits[5].id,
      customSlug: 'fb-kharghar-investors',
      waPrefilledText: 'Saw your listing on Kharghar Investors FB group for Sector 20 2BHK. Please connect.',
      totalClicks: 210,
      totalLeadsGenerated: 16,
      isActive: true,
    },
  });

  // 7. Leads Across Multiple Stages
  const lead1 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      fullName: 'Rahul Sharma',
      phoneE164: '+919820199887',
      email: 'rahul.sharma@example.com',
      city: 'Navi Mumbai',
      leadSource: 'youtube_short',
      campaignId: campaignYtShort.id,
      assignedBrokerId: brokerFarhan.id,
      currentStage: 'closed_won',
      notes: 'Came via YouTube Short #YT-TALOJA-01. Booked 2BHK at Sai Marvel.',
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      fullName: 'Priya Iyer',
      phoneE164: '+919820233445',
      email: 'priya.iyer@example.com',
      city: 'Mumbai (Chembur)',
      leadSource: 'youtube_video',
      campaignId: campaignYtReview.id,
      assignedBrokerId: brokerFarhan.id,
      currentStage: 'visit_done',
      notes: 'Inspected Crown Heights. Interested in 2BHK A-1204, awaiting bank loan sanction.',
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      fullName: 'Amitabh Sen',
      phoneE164: '+919820344556',
      email: 'amitabh.sen@example.com',
      city: 'Navi Mumbai (Vashi)',
      leadSource: 'instagram_reel',
      campaignId: campaignIgReel.id,
      assignedBrokerId: brokerSalman.id,
      currentStage: 'portal_shared',
      notes: 'Active portal user. Swiped photos multiple times.',
    },
  });

  const lead4 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      fullName: 'Dr. Sameer Deshpande',
      phoneE164: '+919820455667',
      email: 'sameer.deshpande@example.com',
      city: 'Kharghar',
      leadSource: 'fb_group',
      campaignId: campaignFbGroup.id,
      assignedBrokerId: brokerSalman.id,
      currentStage: 'closed_won',
      notes: 'Bought ready-to-move 2BHK at Sai Paradise.',
    },
  });

  const lead5 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      fullName: 'Vikram Mehta',
      phoneE164: '+919820566778',
      email: 'vikram.mehta@example.com',
      city: 'Thane',
      leadSource: 'youtube_video',
      campaignId: campaignYtReview.id,
      assignedBrokerId: brokerFarhan.id,
      currentStage: 'visit_scheduled',
      notes: 'Tour scheduled for upcoming Saturday with pickup at Kharghar station.',
    },
  });

  // 8. Buyer Requirements
  await prisma.buyerRequirement.create({
    data: {
      leadId: lead1.id,
      budgetMin: 5500000,
      budgetMax: 7000000,
      bhkPreferencesJson: JSON.stringify([2]),
      targetLocationsJson: JSON.stringify(['Kharghar Sector 35', 'Kharghar Sector 36']),
      possessionPreference: 'ANY',
      minCarpetSqft: 600,
      loanPreApproved: true,
      purpose: 'self_use',
      floorPreference: 'middle',
    },
  });

  await prisma.buyerRequirement.create({
    data: {
      leadId: lead2.id,
      budgetMin: 7000000,
      budgetMax: 8500000,
      bhkPreferencesJson: JSON.stringify([2, 3]),
      targetLocationsJson: JSON.stringify(['Kharghar Sector 35', 'Kharghar Sector 20']),
      possessionPreference: 'READY_TO_MOVE',
      minCarpetSqft: 650,
      loanPreApproved: true,
      purpose: 'self_use',
      floorPreference: 'high',
    },
  });

  await prisma.buyerRequirement.create({
    data: {
      leadId: lead3.id,
      budgetMin: 5000000,
      budgetMax: 6500000,
      bhkPreferencesJson: JSON.stringify([2]),
      targetLocationsJson: JSON.stringify(['Kharghar Sector 35', 'Taloja Phase 1']),
      possessionPreference: 'UNDER_CONSTRUCTION',
      minCarpetSqft: 600,
      loanPreApproved: false,
      purpose: 'investment',
      floorPreference: 'middle',
    },
  });

  // 9. Client Portals & Telemetry Logs
  const portal1 = await prisma.clientPortal.create({
    data: {
      organizationId: org.id,
      leadId: lead3.id,
      token: 'amitabh-sen-2bhk-kharghar-8f2a',
      title: 'Curated 2 BHK Properties for Amitabh Sen',
      customMessage: 'Hello Amitabh, here are top 3 verified 2 BHK investment options within 500m of Metro Line 1.',
      createdById: brokerSalman.id,
      totalViews: 8,
      lastViewedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      portalUnits: {
        create: [
          { propertyUnitId: createdUnits[2].id, displayOrder: 1, isFeatured: true, brokerHighlight: '🔥 Best Construction Quality in Sec 35' },
          { propertyUnitId: createdUnits[4].id, displayOrder: 2, isFeatured: false, brokerHighlight: 'High Rental MIDC Corridor' },
        ],
      },
    },
  });

  // Telemetry logs producing HOT_PROSPECT
  await prisma.portalTelemetryLog.createMany({
    data: [
      { portalId: portal1.id, actionType: 'PORTAL_OPEN', dwellTimeSec: 15 },
      { portalId: portal1.id, unitId: createdUnits[2].id, actionType: 'PHOTO_SWIPE', dwellTimeSec: 40 },
      { portalId: portal1.id, unitId: createdUnits[2].id, actionType: 'PHOTO_SWIPE', dwellTimeSec: 25 },
      { portalId: portal1.id, unitId: createdUnits[2].id, actionType: 'BROCHURE_DOWNLOAD', dwellTimeSec: 10 },
      { portalId: portal1.id, unitId: createdUnits[2].id, actionType: 'WHATSAPP_CLICK', dwellTimeSec: 5 },
    ],
  });

  const portal2 = await prisma.clientPortal.create({
    data: {
      organizationId: org.id,
      leadId: lead2.id,
      token: 'priya-iyer-2bhk-ready-4b9c',
      title: 'Ready Possession Luxury 2 BHKs for Priya Iyer',
      customMessage: 'Priya, as requested here are OC-received 2 BHKs with open valley views.',
      createdById: brokerFarhan.id,
      totalViews: 12,
      lastViewedAt: new Date(Date.now() - 15 * 60 * 1000),
      portalUnits: {
        create: [
          { propertyUnitId: createdUnits[0].id, displayOrder: 1, isFeatured: true, brokerHighlight: '🟢 0% GST • Ready OC' },
          { propertyUnitId: createdUnits[5].id, displayOrder: 2, isFeatured: false, brokerHighlight: 'Central Park Walkable' },
        ],
      },
    },
  });

  await prisma.portalTelemetryLog.createMany({
    data: [
      { portalId: portal2.id, actionType: 'PORTAL_OPEN', dwellTimeSec: 20 },
      { portalId: portal2.id, unitId: createdUnits[0].id, actionType: 'PHOTO_SWIPE', dwellTimeSec: 50 },
      { portalId: portal2.id, unitId: createdUnits[0].id, actionType: 'VISIT_BOOKING_CLICK', dwellTimeSec: 15 },
    ],
  });

  // 10. Site Visits
  const visit1 = await prisma.siteVisit.create({
    data: {
      organizationId: org.id,
      leadId: lead2.id,
      assignedBrokerId: brokerFarhan.id,
      scheduledDate: new Date('2026-08-16'),
      timeSlot: 'Saturday 11:00 AM',
      pickupLocation: 'Kharghar Railway Station (East)',
      cabDetails: 'Ertiga MH-46-AZ-1234 (Driver: Ramesh 9820011223)',
      status: 'COMPLETED',
      itineraryUnitsJson: JSON.stringify([
        {
          unitId: createdUnits[0].id,
          projectName: 'Crown Heights Luxury Towers',
          microMarket: 'Kharghar Sector 35',
          unitNumber: 'A-1204',
          bhk: 2,
          expectedTime: '11:00 AM',
          developerPocName: 'Vikram Joshi',
          developerPocPhone: '+919819001122',
          googleMapsQuery: 'Crown Heights Kharghar Sector 35',
        },
        {
          unitId: createdUnits[5].id,
          projectName: 'Sai Paradise Heights',
          microMarket: 'Kharghar Sector 20',
          unitNumber: 'P-1101',
          bhk: 2,
          expectedTime: '12:30 PM',
          developerPocName: 'Rajesh Nair',
          developerPocPhone: '+919833445566',
          googleMapsQuery: 'Sai Paradise Kharghar Sector 20',
        },
      ]),
      feedbackRating: 5,
      feedbackOutcome: 'HIGH_INTEREST',
      feedbackNotes: 'Client loved Crown Heights A-1204 living room balcony view. Requested cost sheet PDF on WhatsApp.',
    },
  });

  const visit2 = await prisma.siteVisit.create({
    data: {
      organizationId: org.id,
      leadId: lead5.id,
      assignedBrokerId: brokerFarhan.id,
      scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // Upcoming Saturday
      timeSlot: 'Saturday 10:30 AM',
      pickupLocation: 'Central Park Metro Station',
      cabDetails: 'Innova Crysta MH-46-BK-9900 (Driver: Santosh 9819112233)',
      status: 'CONFIRMED',
      itineraryUnitsJson: JSON.stringify([
        {
          unitId: createdUnits[0].id,
          projectName: 'Crown Heights Luxury Towers',
          microMarket: 'Kharghar Sector 35',
          unitNumber: 'A-1204',
          bhk: 2,
          expectedTime: '10:30 AM',
          developerPocName: 'Vikram Joshi',
          developerPocPhone: '+919819001122',
          googleMapsQuery: 'Crown Heights Kharghar Sector 35',
        },
        {
          unitId: createdUnits[2].id,
          projectName: 'Sai Marvel Heights',
          microMarket: 'Kharghar Sector 35',
          unitNumber: 'M-703',
          bhk: 2,
          expectedTime: '11:45 AM',
          developerPocName: 'Anil Rathore',
          developerPocPhone: '+919820334455',
          googleMapsQuery: 'Sai Marvel Kharghar Sector 35',
        },
      ]),
    },
  });

  // 11. Deal Transactions Across Milestones
  // Deal 1: Rahul Sharma - Sai Marvel 2BHK (PAYMENT_RECEIVED)
  const deal1 = await prisma.dealTransaction.create({
    data: {
      organizationId: org.id,
      leadId: lead1.id,
      propertyUnitId: createdUnits[2].id,
      developerProjectId: projectSaiMarvel.id,
      closingBrokerId: brokerFarhan.id,
      agreementValue: 5600000,
      brokeragePercent: 3.0,
      grossBrokerageAmount: 168000,
      repCommissionAmount: 84000,
      firmNetBrokerageAmount: 84000,
      dealStatus: 'PAYMENT_RECEIVED',
      developerInvoiceNumber: 'INV-SAI-2026-089',
      paymentReceivedDate: new Date('2026-08-10'),
      notes: 'Brokerage payment cleared via RTGS into ZamZam current account.',
    },
  });

  // Deal 2: Dr. Sameer Deshpande - Sai Paradise (INVOICE_SENT)
  const deal2 = await prisma.dealTransaction.create({
    data: {
      organizationId: org.id,
      leadId: lead4.id,
      propertyUnitId: createdUnits[5].id,
      developerProjectId: projectParadiseKharghar.id,
      closingBrokerId: brokerSalman.id,
      agreementValue: 8800000,
      brokeragePercent: 2.0,
      grossBrokerageAmount: 176000,
      repCommissionAmount: 88000,
      firmNetBrokerageAmount: 88000,
      dealStatus: 'INVOICE_SENT',
      developerInvoiceNumber: 'INV-PARADISE-2026-042',
      notes: 'GST Tax invoice submitted to Paradise Group finance desk.',
    },
  });

  // Deal 3: Crown Heights 3BHK Luxury with Co-Broker (AGREEMENT_REGISTERED)
  const deal3 = await prisma.dealTransaction.create({
    data: {
      organizationId: org.id,
      leadId: lead2.id,
      propertyUnitId: createdUnits[1].id,
      developerProjectId: projectCrown.id,
      closingBrokerId: brokerFarhan.id,
      agreementValue: 10500000,
      brokeragePercent: 2.5,
      grossBrokerageAmount: 262500,
      coBrokerName: 'Shree Ganesh Properties (Vashi)',
      coBrokerSharePercent: 20,
      repCommissionAmount: 105000,
      firmNetBrokerageAmount: 105000,
      dealStatus: 'AGREEMENT_REGISTERED',
      notes: 'Sub-broker referral split 20%. Agreement registered at Kharghar Sub-Registrar.',
    },
  });

  // Deal 4: Galaxy Metro Taloja 1BHK Investor Booking (TOKEN_RECEIVED)
  const deal4 = await prisma.dealTransaction.create({
    data: {
      organizationId: org.id,
      leadId: lead3.id,
      propertyUnitId: createdUnits[3].id,
      developerProjectId: projectGalaxyTaloja.id,
      closingBrokerId: brokerSalman.id,
      agreementValue: 3200000,
      brokeragePercent: 3.0,
      grossBrokerageAmount: 96000,
      repCommissionAmount: 48000,
      firmNetBrokerageAmount: 48000,
      dealStatus: 'TOKEN_RECEIVED',
      notes: '₹51,000 Booking token check deposited with Galaxy Builders.',
    },
  });

  console.log('✅ Comprehensive Seed Completed Successfully!');
  console.log(`- 1 Organization (${org.name})`);
  console.log(`- 4 Staff Users (Admin, 2 Senior Brokers, 1 Telecaller)`);
  console.log(`- 4 Developer Projects & ${createdUnits.length} Property Units`);
  console.log(`- 4 Inbound Social Campaigns (YouTube, Instagram, FB)`);
  console.log(`- 5 Inbound Leads with Buyer Requirements`);
  console.log(`- 2 Tokenized Client Portals & Telemetry Stream`);
  console.log(`- 2 Multi-Project Site Visits & Itineraries`);
  console.log(`- 4 Deal Transactions totaling ₹7,02,500 in Gross Brokerage Pipeline`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
