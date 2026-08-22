const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Master Real-World ZamZam Properties Real Estate CRM Seed...');

  // 1. Clean existing records in reverse dependency order
  await prisma.portalTelemetryLog.deleteMany({});
  await prisma.clientPortalUnit.deleteMany({});
  await prisma.clientPortal.deleteMany({});
  await prisma.dealTransaction.deleteMany({});
  await prisma.siteVisit.deleteMany({});
  await prisma.communicationLog.deleteMany({});
  await prisma.buyerRequirement.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.contactMergeAudit.deleteMany({});
  await prisma.contactIdentity.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.brokerPhoneNumber.deleteMany({});
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
          'Kharghar Sector 1',
          'Kharghar Sector 2',
          'Kharghar Sector 6',
          'Kharghar Sector 7',
          'Kharghar Sector 10',
          'Kharghar Sector 11',
          'Kharghar Sector 14',
          'Kharghar Sector 19',
          'Kharghar Sector 20',
          'Kharghar Sector 24',
          'Kharghar Sector 27',
          'Kharghar Sector 34',
          'Kharghar Sector 35',
          'Kharghar Sector 36',
          'Kharghar Sector 37',
          'Taloja Phase 1 Sector 4',
          'Taloja Phase 1 Sector 6',
          'Taloja Phase 1 Sector 11',
          'Taloja Phase 1 Sector 16',
          'Taloja Phase 2 Sector 21',
          'Taloja Phase 2 Sector 23',
          'Taloja Phase 2 Sector 28',
        ],
      }),
    },
  });

  // 3. Create Staff Users & Real Broker Identities (Safwan Diwan & Suhel Patel)
  const adminUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      fullName: 'Usaid Patel',
      email: 'usaid@zamzamproperties.in',
      phoneE164: '+919820123456',
      role: 'SUPER_ADMIN',
    },
  });

  const brokerSafwan = await prisma.user.create({
    data: {
      organizationId: org.id,
      fullName: 'Safwan Diwan',
      email: 'safwan@zamzamproperties.in',
      phoneE164: '+917977552011',
      role: 'BROKER_MANAGER',
    },
  });

  const brokerSuhel = await prisma.user.create({
    data: {
      organizationId: org.id,
      fullName: 'Suhel Patel',
      email: 'suhel@zamzamproperties.in',
      phoneE164: '+919967731071',
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

  // 4. Broker Phone Numbers
  const brokerPhoneSafwan = await prisma.brokerPhoneNumber.create({
    data: {
      organizationId: org.id,
      brokerId: brokerSafwan.id,
      e164: '+917977552011',
      displayName: 'Safwan Diwan (Senior Broker & Kharghar Lead)',
      whatsappPhoneNumberId: 'phone_num_id_safwan_7977552011',
      active: true,
    },
  });

  const brokerPhoneSuhel = await prisma.brokerPhoneNumber.create({
    data: {
      organizationId: org.id,
      brokerId: brokerSuhel.id,
      e164: '+919967731071',
      displayName: 'Suhel Patel (Senior Broker & Taloja / Residential Lead)',
      whatsappPhoneNumberId: 'phone_num_id_suhel_9967731071',
      active: true,
    },
  });

  // 5. Load Cleaned Master Inventory JSON
  const masterFilePath = path.join(__dirname, '..', 'data', 'scraped', 'master_kharghar_taloja_inventory.json');
  let cleanedProjects = [];

  if (fs.existsSync(masterFilePath)) {
    cleanedProjects = JSON.parse(fs.readFileSync(masterFilePath, 'utf8'));
  } else {
    throw new Error('Master inventory file not found. Run "bun run scripts/clean-master-inventory.ts" first.');
  }

  console.log(`📦 Seeding ${cleanedProjects.length} real projects across Kharghar & Taloja...`);

  const createdProjectsMap = new Map();
  const createdUnitsMap = new Map();
  const allCreatedUnits = [];

  for (const proj of cleanedProjects) {
    const sanitizedMedia = [
      ...proj.elevationImages.map((url, idx) => ({
        id: `${proj.slug}-elev-${idx + 1}`,
        url,
        kind: 'image',
        type: 'ELEVATION',
        category: 'elevation',
        title: `${proj.projectName} Architectural Elevation ${idx + 1}`,
      })),
      ...proj.floorPlanImages.map((url, idx) => ({
        id: `${proj.slug}-fp-${idx + 1}`,
        url,
        kind: 'image',
        type: 'FLOOR_PLAN',
        category: 'floorplan',
        title: `${proj.projectName} Sanctioned Floor Plan ${idx + 1}`,
      })),
    ];

    const projectRecord = await prisma.developerProject.create({
      data: {
        organizationId: org.id,
        developerName: proj.developerName,
        projectName: proj.projectName,
        reraNumber: proj.reraNumber,
        microMarket: proj.microMarket,
        subLocality: proj.subLocality,
        latitude: proj.latitude,
        longitude: proj.longitude,
        distanceToMetroKm: proj.distanceToMetroKm,
        hasOccupancyCertificate: proj.hasOccupancyCertificate,
        commencementCertificateDate: new Date(proj.commencementCertificateDate),
        expectedPossessionDate: new Date(proj.expectedPossessionDate),
        totalTowers: proj.totalTowers,
        totalFloors: proj.totalFloors,
        basePricePerSqft: proj.basePricePerSqft,
        shortDescription: proj.shortDescription,
        description: proj.description,
        locationDescription: proj.locationDescription,
        keyHighlightsJson: JSON.stringify(proj.keyHighlights),
        coverImageUrl: proj.coverImageUrl,
        brochureUrl: proj.brochureUrl,
        youtubeWalkthroughUrl: proj.youtubeWalkthroughUrl,
        masterPlanUrl: proj.masterPlanUrl,
        mediaGalleryJson: JSON.stringify(sanitizedMedia),
        amenitiesJson: JSON.stringify(proj.amenities),
        developerSalesPocName: proj.developerSalesPocName,
        developerSalesPocPhone: proj.developerSalesPocPhone,
        standardCommissionPercent: proj.standardCommissionPercent,
      },
    });

    createdProjectsMap.set(proj.slug, projectRecord);

    // Ingest units for this project
    for (const unit of proj.units) {
      const unitRecord = await prisma.propertyUnit.create({
        data: {
          projectId: projectRecord.id,
          unitNumber: unit.unitNumber,
          bhk: unit.bhk,
          bathrooms: unit.bathrooms,
          balconies: unit.balconies,
          floorNumber: unit.floorNumber,
          totalFloors: unit.totalFloors,
          carpetAreaSqft: unit.carpetAreaSqft,
          facing: unit.facing,
          possessionStatus: unit.possessionStatus,
          possessionDate: new Date(unit.possessionDate),
          agreementValue: unit.agreementValue,
          stampDutyRate: unit.stampDutyRate,
          registrationFee: unit.registrationFee,
          gstRate: unit.gstRate,
          floorRiseCharges: unit.floorRiseCharges,
          parkingCharges: unit.parkingCharges,
          societyDevelopmentCharges: unit.societyDevelopmentCharges,
          allInTotalCost: unit.allInTotalCost,
          verificationStatus: 'ACTIVE_MARKETABLE',
          verifiedByUserId: brokerSafwan.id,
          lastVerifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          verificationNotes: `Physical audit complete. MahaRERA registration ${proj.reraNumber} verified.`,
          description: unit.description,
          featureHighlightsJson: JSON.stringify([
            `RERA Carpet: ${unit.carpetAreaSqft} sq.ft. (${unit.carpetAreaSqm} sq.m.)`,
            `Built-Up Area: ${unit.builtUpAreaSqft} sq.ft. • Super Built-Up: ${unit.superBuiltUpAreaSqft} sq.ft. (CIDCO Loading ${unit.loadingPercentage}%)`,
            `Facing: ${unit.facing} • Floor ${unit.floorNumber} of ${unit.totalFloors}`,
            `Status: ${unit.possessionStatus === 'READY_TO_MOVE' ? 'Ready OC (0% GST)' : 'Under-Construction (5% GST)'}`,
          ]),
          floorPlanUrl: unit.floorPlanUrl,
          mediaGalleryJson: JSON.stringify([
            {
              id: `${proj.slug}-${unit.unitNumber}-elev`,
              url: unit.elevationImageUrl,
              kind: 'image',
              title: `${proj.projectName} Tower Elevation`,
              category: 'elevation',
            },
            {
              id: `${proj.slug}-${unit.unitNumber}-fp`,
              url: unit.floorPlanUrl,
              kind: 'image',
              title: `${unit.unitNumber} ${unit.bhk} BHK Architectural Floor Plan`,
              category: 'floorplan',
            },
          ]),
          photoGalleryJson: JSON.stringify([
            unit.elevationImageUrl,
            unit.floorPlanUrl,
          ]),
          videoReelUrl: proj.youtubeWalkthroughUrl,
          isHotDeal: unit.isHotDeal,
          isExclusive: unit.isExclusive,
        },
      });

      createdUnitsMap.set(`${proj.slug}-${unit.unitNumber}`, unitRecord);
      allCreatedUnits.push(unitRecord);
    }
  }

  console.log(`🏘️ Successfully seeded ${createdProjectsMap.size} projects and ${allCreatedUnits.length} property units!`);

  // Key Project References for linking
  const projSaiWorldEmpire = createdProjectsMap.get('sai-world-empire-kharghar-36');
  const projAdhiraj = createdProjectsMap.get('adhiraj-capital-city-kharghar-37');
  const projArihantClan = createdProjectsMap.get('arihant-clan-aalishan-kharghar-35');
  const projSaiMarvel = createdProjectsMap.get('paradise-sai-marvel-kharghar-20');
  const projLodhaCrown = createdProjectsMap.get('lodha-crown-taloja-phase-1');
  const projGalaxyOrion = createdProjectsMap.get('galaxy-orion-taloja-phase-1-sec6');
  const projJuhiNiharika = createdProjectsMap.get('juhi-niharika-kharghar-34');
  const projHydePark = createdProjectsMap.get('hyde-park-kharghar-19');
  const projPendharMetro = createdProjectsMap.get('pendhar-metro-heights-taloja-phase-1-sec16');

  // Key Unit References
  const unitSaiWorld2Bhk = createdUnitsMap.get('sai-world-empire-kharghar-36-Tower Caesar - 1802') || allCreatedUnits[0];
  const unitSaiWorld3Bhk = createdUnitsMap.get('sai-world-empire-kharghar-36-Tower Napoleon - 3201') || allCreatedUnits[1];
  const unitAdhiraj2Bhk = createdUnitsMap.get('adhiraj-capital-city-kharghar-37-Tower Meraki - 1404') || allCreatedUnits[2];
  const unitArihant2Bhk = createdUnitsMap.get('arihant-clan-aalishan-kharghar-35-T2-2403') || allCreatedUnits[3];
  const unitSaiMarvel2Bhk = createdUnitsMap.get('paradise-sai-marvel-kharghar-20-A-1502') || allCreatedUnits[4];
  const unitLodha1Bhk = createdUnitsMap.get('lodha-crown-taloja-phase-1-Tower 4 - 302') || allCreatedUnits[5];
  const unitGalaxy1Bhk = createdUnitsMap.get('galaxy-orion-taloja-phase-1-sec6-A-502') || allCreatedUnits[6];

  // 6. Inbound Campaigns
  const campaignSaiEmpire = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'YouTube Walkthrough: Sai World Empire 18-Acre Themed Mega Township',
      channelType: 'YOUTUBE_VIDEO',
      contentId: 'yt-sai-world-empire-tour',
      sourceCode: 'SAIWORLD36',
      targetProjectId: projSaiWorldEmpire ? projSaiWorldEmpire.id : null,
      targetPropertyUnitId: unitSaiWorld2Bhk.id,
      assignedBrokerId: brokerSafwan.id,
      customSlug: 'yt-sai-empire-36',
      waPrefilledText: 'Hi ZamZam Properties, saw your walkthrough of Sai World Empire Sector 36. Code: SAIWORLD36. Please send Athena clubhouse brochure and RERA cost sheet.',
      totalClicks: 1450,
      totalLeadsGenerated: 88,
      isActive: true,
    },
  });

  const campaignAdhiraj = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'YouTube Review: Adhiraj Capital City 54-Storey Skyscraper Tour',
      channelType: 'YOUTUBE_VIDEO',
      contentId: 'yt-adhiraj-capital-city',
      sourceCode: 'ADHIRAJ37',
      targetProjectId: projAdhiraj ? projAdhiraj.id : null,
      targetPropertyUnitId: unitAdhiraj2Bhk.id,
      assignedBrokerId: brokerSafwan.id,
      customSlug: 'yt-adhiraj-city',
      waPrefilledText: 'Hi ZamZam Properties, interested in Adhiraj Capital City 2 BHK. Code: ADHIRAJ37. Looking for high-floor inventory.',
      totalClicks: 980,
      totalLeadsGenerated: 54,
      isActive: true,
    },
  });

  const campaignArihant = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'Instagram Reel: Arihant Clan Aalishan 53-Storey Persian Towers',
      channelType: 'INSTAGRAM_REEL',
      contentId: 'ig-reel-arihant-aalishan',
      sourceCode: 'AALISHAN35',
      targetProjectId: projArihantClan ? projArihantClan.id : null,
      targetPropertyUnitId: unitArihant2Bhk.id,
      assignedBrokerId: brokerSuhel.id,
      customSlug: 'ig-arihant-aalishan',
      waPrefilledText: 'Hi ZamZam, saw your Reel for Arihant Clan Aalishan Sector 35. Code: AALISHAN35. Please share Metro distance and payment plan.',
      totalClicks: 740,
      totalLeadsGenerated: 42,
      isActive: true,
    },
  });

  const campaignLodhaTaloja = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'YouTube Short: Lodha Crown Taloja 1 & 2 BHK Under ₹40L',
      channelType: 'YOUTUBE_SHORT',
      contentId: 'yt-short-lodha-taloja',
      sourceCode: 'LODHATAL4',
      targetProjectId: projLodhaCrown ? projLodhaCrown.id : null,
      targetPropertyUnitId: unitLodha1Bhk.id,
      assignedBrokerId: brokerSuhel.id,
      customSlug: 'yt-lodha-crown',
      waPrefilledText: 'Hi ZamZam Properties, saw your Short for Lodha Crown Taloja. Code: LODHATAL4. Need price list & bus schedule.',
      totalClicks: 1680,
      totalLeadsGenerated: 95,
      isActive: true,
    },
  });

  // 7. Durable Contacts & Multi-Identity Resolution
  const contactRahul = await prisma.contact.create({
    data: {
      organizationId: org.id,
      primaryName: 'Rahul Sharma',
      companyName: 'Infosys (Airoli Mindspace)',
      assignedBrokerId: brokerSafwan.id,
      lifecycleStage: 'ACTIVE_BUYER',
      notes: 'Sr. IT Consultant at Airoli Mindspace. Looking for premium 2 BHK in Upper Kharghar near Metro. Budget ₹1.35 Cr - ₹1.55 Cr.',
      identities: {
        create: [
          { identityType: 'PHONE_E164', identityValue: '+919820445566', isPrimary: true, verifiedAt: new Date() },
          { identityType: 'WHATSAPP_WAID', identityValue: '919820445566', isPrimary: false, verifiedAt: new Date() },
          { identityType: 'EMAIL', identityValue: 'rahul.sharma@infosys.com', isPrimary: false },
        ],
      },
    },
  });

  const contactAmit = await prisma.contact.create({
    data: {
      organizationId: org.id,
      primaryName: 'Amit Verma',
      companyName: 'Barclays (BKC)',
      assignedBrokerId: brokerSafwan.id,
      lifecycleStage: 'VISITOR',
      notes: 'Investment banking VP. High intent for 3 BHK luxury township in Sai World Empire or Adhiraj Capital City. Pre-approved loan of ₹2.2 Cr from HDFC.',
      identities: {
        create: [
          { identityType: 'PHONE_E164', identityValue: '+919819998877', isPrimary: true, verifiedAt: new Date() },
          { identityType: 'EMAIL', identityValue: 'amit.verma@barclays.com', isPrimary: false },
        ],
      },
    },
  });

  const contactPooja = await prisma.contact.create({
    data: {
      organizationId: org.id,
      primaryName: 'Pooja Iyer',
      companyName: 'TCS (Ghansoli)',
      assignedBrokerId: brokerSuhel.id,
      lifecycleStage: 'NEGOTIATING',
      notes: 'Software Architect. Shortlisted Lodha Crown Taloja and Galaxy Orion. Budget ₹35L - ₹50L. First time home buyer.',
      identities: {
        create: [
          { identityType: 'PHONE_E164', identityValue: '+919833221100', isPrimary: true, verifiedAt: new Date() },
          { identityType: 'WHATSAPP_WAID', identityValue: '919833221100', isPrimary: false, verifiedAt: new Date() },
        ],
      },
    },
  });

  // 8. Leads with Exact Organic Attribution & Buyer Requirements
  const leadRahul = await prisma.lead.create({
    data: {
      organizationId: org.id,
      contactId: contactRahul.id,
      fullName: 'Rahul Sharma',
      phoneE164: '+919820445566',
      email: 'rahul.sharma@infosys.com',
      city: 'Navi Mumbai',
      leadSource: 'WHATSAPP_EXACT',
      sourceConfidence: 'EXACT',
      sourceCode: 'SAIWORLD36',
      campaignId: campaignSaiEmpire.id,
      assignedBrokerId: brokerSafwan.id,
      currentStage: 'portal_shared',
      notes: 'Came via YouTube Walkthrough for Sai World Empire. Received automated WhatsApp brochure.',
      firstResponseSlaMinutes: 12,
      firstResponseAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      requirements: {
        create: {
          budgetMin: 12000000,
          budgetMax: 16000000,
          bhkPreferencesJson: JSON.stringify([2]),
          targetLocationsJson: JSON.stringify(['Kharghar Sector 36', 'Kharghar Sector 37', 'Kharghar Sector 35']),
          possessionPreference: 'READY_TO_MOVE',
          loanPreApproved: true,
          purpose: 'self_use',
          floorPreference: 'high',
        },
      },
      communications: {
        create: [
          { channel: 'WHATSAPP', direction: 'INBOUND', messageContent: 'Hi ZamZam Properties, saw your walkthrough of Sai World Empire Sector 36. Code: SAIWORLD36. Please send Athena clubhouse brochure and RERA cost sheet.' },
          { channel: 'WHATSAPP', direction: 'OUTBOUND', messageContent: 'Hello Rahul! Safwan here from ZamZam Properties. Here is the official verified cost sheet and 2 BHK layout for Sai World Empire.' },
        ],
      },
    },
  });

  const leadAmit = await prisma.lead.create({
    data: {
      organizationId: org.id,
      contactId: contactAmit.id,
      fullName: 'Amit Verma',
      phoneE164: '+919819998877',
      email: 'amit.verma@barclays.com',
      city: 'Mumbai',
      leadSource: 'YOUTUBE_EXACT',
      sourceConfidence: 'EXACT',
      sourceCode: 'ADHIRAJ37',
      campaignId: campaignAdhiraj.id,
      assignedBrokerId: brokerSafwan.id,
      currentStage: 'visit_scheduled',
      notes: 'Wants physical site tour of Adhiraj 54-storey tower and Sai World Empire on Saturday.',
      requirements: {
        create: {
          budgetMin: 18000000,
          budgetMax: 24000000,
          bhkPreferencesJson: JSON.stringify([3]),
          targetLocationsJson: JSON.stringify(['Kharghar Sector 36', 'Kharghar Sector 37']),
          possessionPreference: 'READY_TO_MOVE',
          loanPreApproved: true,
          purpose: 'self_use',
          floorPreference: 'high',
        },
      },
    },
  });

  const leadPooja = await prisma.lead.create({
    data: {
      organizationId: org.id,
      contactId: contactPooja.id,
      fullName: 'Pooja Iyer',
      phoneE164: '+919833221100',
      city: 'Navi Mumbai',
      leadSource: 'WHATSAPP_EXACT',
      sourceConfidence: 'EXACT',
      sourceCode: 'LODHATAL4',
      campaignId: campaignLodhaTaloja.id,
      assignedBrokerId: brokerSuhel.id,
      currentStage: 'visit_done',
      notes: 'Completed physical inspection of Lodha Crown Taloja Tower 4. Reviewing token agreement.',
      requirements: {
        create: {
          budgetMin: 2500000,
          budgetMax: 5000000,
          bhkPreferencesJson: JSON.stringify([1, 2]),
          targetLocationsJson: JSON.stringify(['Taloja Phase 1 Sector 4', 'Taloja Phase 1 Sector 6']),
          possessionPreference: 'READY_TO_MOVE',
          loanPreApproved: true,
          purpose: 'self_use',
        },
      },
    },
  });

  // 9. Client Presentation Portals
  const portalRahul = await prisma.clientPortal.create({
    data: {
      organizationId: org.id,
      leadId: leadRahul.id,
      token: 'rahul-2bhk-kharghar-options',
      title: 'Curated Upper Kharghar 2 BHK Luxury Residences for Rahul Sharma',
      customMessage: 'Hi Rahul, Safwan Diwan here. Based on your requirement for a ready-to-move 2 BHK with high-rise valley views near Amandoot Metro, I have handpicked these top 3 verified options for you.',
      createdById: brokerSafwan.id,
      totalViews: 14,
      lastViewedAt: new Date(),
      portalUnits: {
        create: [
          { propertyUnitId: unitSaiWorld2Bhk.id, displayOrder: 1, isFeatured: true, brokerHighlight: '🔥 Top Pick: 18th Floor Roman Balcony with Unmatched Valley Sunrise' },
          { propertyUnitId: unitAdhiraj2Bhk.id, displayOrder: 2, isFeatured: false, brokerHighlight: 'Iconic 54-Storey Skyscraper with 6-Acre Private Central Park' },
          { propertyUnitId: unitArihant2Bhk.id, displayOrder: 3, isFeatured: false, brokerHighlight: 'Persian Architecture with Sufiyana Lounge & Metro Proximity' },
        ],
      },
    },
  });

  await prisma.portalTelemetryLog.createMany({
    data: [
      { portalId: portalRahul.id, actionType: 'PORTAL_OPEN', dwellTimeSec: 45 },
      { portalId: portalRahul.id, unitId: unitSaiWorld2Bhk.id, actionType: 'VIDEO_PLAY', dwellTimeSec: 85 },
      { portalId: portalRahul.id, unitId: unitSaiWorld2Bhk.id, actionType: 'PHOTO_SWIPE', dwellTimeSec: 30 },
      { portalId: portalRahul.id, unitId: unitSaiWorld2Bhk.id, actionType: 'BROCHURE_DOWNLOAD', dwellTimeSec: 10 },
      { portalId: portalRahul.id, unitId: unitAdhiraj2Bhk.id, actionType: 'PHOTO_SWIPE', dwellTimeSec: 25 },
    ],
  });

  // 10. Site Visits & Guided Logistics
  const visitAmit = await prisma.siteVisit.create({
    data: {
      organizationId: org.id,
      leadId: leadAmit.id,
      assignedBrokerId: brokerSafwan.id,
      scheduledDate: new Date('2026-08-22'),
      timeSlot: 'Saturday 11:00 AM',
      pickupLocation: 'Central Park Metro Station Gate 1',
      cabDetails: 'Innova Crysta MH-46-AZ-5566 (Driver: Suresh 9820011223)',
      status: 'CONFIRMED',
      itineraryUnitsJson: JSON.stringify([
        {
          unitId: unitSaiWorld3Bhk.id,
          projectName: 'Sai World Empire',
          microMarket: 'Kharghar Sector 36',
          unitNumber: 'Tower Napoleon - 3201',
          bhk: 3,
          expectedTime: '11:00 AM',
          developerPocName: 'Sunil Punjabi',
          developerPocPhone: '+919820234536',
          googleMapsQuery: 'Sai World Empire Kharghar Sector 36',
        },
        {
          unitId: unitAdhiraj2Bhk.id,
          projectName: 'Adhiraj Capital City',
          microMarket: 'Kharghar Sector 37',
          unitNumber: 'Tower Meraki - 1404',
          bhk: 2,
          expectedTime: '12:30 PM',
          developerPocName: 'Nitin Kadam',
          developerPocPhone: '+919820234537',
          googleMapsQuery: 'Adhiraj Capital City Kharghar Sector 37',
        },
      ]),
      feedbackNotes: 'Family visiting from South Mumbai. Very keen on Club Athena and central park views.',
      feedbackRating: 5,
      feedbackOutcome: 'HIGH_INTEREST',
    },
  });

  // 11. Deal Transactions & Commissions Ledger
  const dealPooja = await prisma.dealTransaction.create({
    data: {
      organizationId: org.id,
      leadId: leadPooja.id,
      propertyUnitId: unitLodha1Bhk.id,
      developerProjectId: projLodhaCrown ? projLodhaCrown.id : allCreatedUnits[0].projectId,
      closingBrokerId: brokerSuhel.id,
      dealStatus: 'PAYMENT_RECEIVED',
      agreementValue: 2449500,
      brokeragePercent: 2.5,
      grossBrokerageAmount: 61237.5,
      repCommissionAmount: 30618.75, // 50% split
      firmNetBrokerageAmount: 30618.75,
      paymentReceivedDate: new Date('2026-08-18'),
      notes: 'Deal closed within 10 days of YouTube Short inquiry. Full 2.5% brokerage cleared by Lodha Group.',
    },
  });

  console.log('✅ Real-World Master Seed Completed Successfully!');
  console.log(`- ${cleanedProjects.length} Verified Real Projects across all sectors of Kharghar & Taloja`);
  console.log(`- ${allCreatedUnits.length} Property Units with Exact RERA Carpets, Room Blueprints & Statutory Cost Sheets`);
  console.log(`- 4 Organic Multi-Channel Campaigns`);
  console.log(`- 3 Active Contacts & Verified Multi-Identities`);
  console.log(`- 3 Leads with Live Sourced Attribution`);
  console.log(`- 1 Tokenized Client Presentation Portal (/p/rahul-2bhk-kharghar-options)`);
  console.log(`- 1 Site Visit Tour with Escorted Cab Logistics`);
  console.log(`- 1 Closed Deal with Settled Commission`);
}

main()
  .catch((e) => {
    console.error('❌ Master Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
