const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Comprehensive ZamZam Properties Real Estate CRM Seed (All 10 Phases)...');

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
          'Kharghar Sector 35',
          'Kharghar Sector 36',
          'Kharghar Sector 20',
          'Taloja Phase 1',
          'Taloja Phase 2',
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

  // 4. Broker Phone Number Ownership Invariant Table
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

  // 5. Developer Projects across Navi Mumbai Micro-Markets with Authentic Media & Descriptions
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
      shortDescription: '22-storey twin high-rise towers with panoramic valley views, rooftop infinity pool, and 450m proximity to Metro Line 1.',
      description: 'Crown Heights Luxury Towers is an OC-received residential enclave designed for discerning families seeking ready possession without construction delays. Features German acoustic window systems, Italian marble flooring, 3-tier biometric security, and dedicated EV charging bays.',
      locationDescription: 'Located on Upper Kharghar Valley Road (Sector 35), adjacent to the scenic CIDCO golf course corridor and 450m from Kharghar Sector 35 Metro Station.',
      keyHighlightsJson: JSON.stringify([
        '100% Ready-to-Move with Full OC',
        '0% GST statutory savings (Save ₹3.4L+)',
        'Panoramic Kharghar Hill & Valley views',
        '450m direct walk to Metro Line 1 Station',
      ]),
      coverImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=85',
      brochureUrl: 'https://zamzamproperties.in/brochures/crown-heights-sec35.pdf',
      youtubeWalkthroughUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      masterPlanUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1600&auto=format&fit=crop&q=85',
      mediaGalleryJson: JSON.stringify([
        {
          id: 'crown-proj-1',
          url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Crown Heights Tower Elevation',
          caption: '22-storey contemporary twin towers with grand glass facade in Kharghar Sector 35.',
          category: 'exterior',
        },
        {
          id: 'crown-proj-2',
          url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Grand Triple-Height Lobby',
          caption: 'Italian marble finished entrance foyer with 24/7 concierge reception desk.',
          category: 'amenity',
        },
        {
          id: 'crown-proj-3',
          url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Rooftop Infinity Pool & Skydeck',
          caption: 'Temperature-controlled rooftop pool overlooking Kharghar hills and golf course.',
          category: 'amenity',
        },
      ]),
      amenitiesJson: JSON.stringify(['Clubhouse', 'Rooftop Swimming Pool', 'Gymnasium', 'Landscaped Zen Garden', 'Intercom & Biometric Entry', 'High-Speed Elevators', 'EV Charging Bays']),
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
      subLocality: 'Metro Link Road, Sector 35',
      latitude: 19.061,
      longitude: 73.084,
      distanceToMetroKm: 0.35,
      hasOccupancyCertificate: false,
      commencementCertificateDate: new Date('2022-08-01'),
      expectedPossessionDate: new Date('2025-12-31'),
      totalTowers: 1,
      totalFloors: 18,
      basePricePerSqft: 13500,
      shortDescription: 'Premium 18-storey tower with high-speed elevators, rooftop lounge, and 350m direct walking distance to Kharghar Metro.',
      description: 'Sai Marvel Heights is currently at Slab 14 casting stage with sample flat ready for inspection. Engineered with seismic-resistant Mivan aluminum formwork, offering optimal thermal insulation and acoustic privacy.',
      locationDescription: 'Located 350m from Kharghar Sector 35 Metro Station, 5 minutes from Central Park and 10 minutes to the upcoming Navi Mumbai International Airport connector.',
      keyHighlightsJson: JSON.stringify([
        'Mivan Monolithic Concrete Construction',
        'Sample Flat Ready for Physical Inspection',
        '350m to Kharghar Metro Line 1 Station',
        '30:70 Builder Subvention Plan Available',
      ]),
      coverImageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&auto=format&fit=crop&q=85',
      brochureUrl: 'https://zamzamproperties.in/brochures/sai-marvel-sec35.pdf',
      youtubeWalkthroughUrl: 'https://www.youtube.com/embed/ScMzIvxBSi4',
      masterPlanUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1600&auto=format&fit=crop&q=85',
      mediaGalleryJson: JSON.stringify([
        {
          id: 'sai-marvel-proj-1',
          url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Sai Marvel Elevation & Approach',
          caption: '18-storey modern tower near Kharghar Sector 35 Metro Station.',
          category: 'exterior',
        },
        {
          id: 'sai-marvel-proj-2',
          url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Podium Garden & Children Play Zone',
          caption: 'Landscaped podium garden with jogging track and children activity deck.',
          category: 'amenity',
        },
      ]),
      amenitiesJson: JSON.stringify(['Grand Double-Height Lobby', 'Rooftop Sunset Lounge', 'Kids Play Area', '24x7 Security with CCTV', 'Fire Fighting System', 'Rainwater Harvesting']),
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
      shortDescription: '3-tower modern gated community located 250m from Taloja Metro Terminal with podium parking and dedicated sports arena.',
      description: 'Galaxy Metro Heights is an affordable luxury township in Taloja Phase 1 designed for maximum space efficiency and rapid Metro Line 1 connectivity. Features solar water heating, badminton courts, and 24-hour backup.',
      locationDescription: 'Prime Taloja Phase 1 location directly opposite the CIDCO Metro Station Terminal with direct arterial connection to Old Mumbai-Pune Highway.',
      keyHighlightsJson: JSON.stringify([
        '250m to Taloja Metro Station Terminal',
        'Affordable 1 & 2 BHK starting ₹38L All-In',
        'PMAY Subsidy eligible project',
        'Podium parking with high rental yield',
      ]),
      coverImageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&auto=format&fit=crop&q=85',
      brochureUrl: 'https://zamzamproperties.in/brochures/galaxy-metro-taloja.pdf',
      youtubeWalkthroughUrl: 'https://www.youtube.com/embed/L_LUpnjgPso',
      masterPlanUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1600&auto=format&fit=crop&q=85',
      mediaGalleryJson: JSON.stringify([
        {
          id: 'galaxy-proj-1',
          url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Galaxy Metro Heights Facade',
          caption: 'Phase 1 gated development with commercial high-street retail on ground floor.',
          category: 'exterior',
        },
      ]),
      amenitiesJson: JSON.stringify(['Podium Parking', 'Jogging Track', 'Badminton Court', 'Solar Water Heating', 'Commercial High-Street Retail']),
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
      shortDescription: 'Ultra-luxury ready possession high-rise on Central Park Boulevard with Olympic size swimming pool and golf course views.',
      description: 'Sai Paradise Heights is an iconic address in Kharghar Sector 20. Ready to move with full Occupancy Certificate. Walking distance to 290-acre Central Park, ISKCON temple, and CIDCO Golf Course.',
      locationDescription: 'Prime Central Park Boulevard, Sector 20, Kharghar. Surrounded by leading international schools and multispecialty healthcare centers.',
      keyHighlightsJson: JSON.stringify([
        '100% OC Ready to Move',
        'Direct frontage onto Central Park Boulevard',
        'Olympic Size Pool and Clubhouse',
        'Exclusive 2 apartments per floor layout',
      ]),
      coverImageUrl: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1600&auto=format&fit=crop&q=85',
      brochureUrl: 'https://zamzamproperties.in/brochures/sai-paradise-sec20.pdf',
      youtubeWalkthroughUrl: 'https://www.youtube.com/embed/9No-FiEInLA',
      masterPlanUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1600&auto=format&fit=crop&q=85',
      mediaGalleryJson: JSON.stringify([
        {
          id: 'paradise-proj-1',
          url: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Sai Paradise Exterior View',
          caption: 'Central Park frontage luxury development with private elevators.',
          category: 'exterior',
        },
      ]),
      amenitiesJson: JSON.stringify(['Olympic Size Pool', 'Tennis Court', 'Banquet Hall', 'Spa & Sauna', 'EV Charging Station', 'Multi-Tier Security']),
      developerSalesPocName: 'Rajesh Nair',
      developerSalesPocPhone: '+919833445566',
      standardCommissionPercent: 2.0,
    },
  });

  // 6. Create Property Units with Rich Media Galleries, Host Reels, Floor Plans, and Accurate Measurements
  const unitsData = [
    // 0: Crown Heights (Kharghar 35 - 2BHK Ready OC)
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
      possessionDate: new Date('2024-06-01'),
      agreementValue: 6800000,
      stampDutyRate: 6.0,
      registrationFee: 30000,
      gstRate: 0.0,
      floorRiseCharges: 180000,
      parkingCharges: 250000,
      societyDevelopmentCharges: 250000,
      allInTotalCost: 7912000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: brokerSafwan.id,
      lastVerifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      verificationNotes: 'Physical broker audit done. OC copy verified with MahaRERA portal.',
      description: 'High-floor East-facing 2 BHK offering sunrise views over Kharghar Hills. Ready-to-move with confirmed Occupancy Certificate (0% GST). Features a 5.5ft wide private deck, Italian marble in the living room, and modular kitchen.',
      featureHighlightsJson: JSON.stringify([
        'East Facing with unobstructed morning sunrise views',
        '100% OC Received (Save ₹3.4L in GST)',
        'Vitrified Italian floor tiles throughout living & bedrooms',
        'Split AC pre-piping installed in all rooms',
        'Zero dead-space layout with 685 sq.ft usable carpet',
      ]),
      floorPlanUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&auto=format&fit=crop&q=80',
      videoReelUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      mediaGalleryJson: JSON.stringify([
        {
          id: 'crown-a1204-video-1',
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          kind: 'video',
          title: '60s Host Walkthrough: East Facing 2BHK Ready with OC',
          caption: 'Watch Safwan Diwan walk through the spacious 12th floor 2BHK with open valley deck.',
          posterUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80',
          duration: '1:15',
          hostName: 'Safwan Diwan',
          hostRole: 'Senior Kharghar Property Specialist',
          category: 'walkthrough',
        },
        {
          id: 'crown-a1204-photo-1',
          url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Living Room & Valley Balcony Deck',
          caption: 'Spacious 11x18 ft living room with vitrified Italian tiles and attached 5.5 ft sit-out deck.',
          category: 'interior',
        },
        {
          id: 'crown-a1204-photo-2',
          url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Modular Kitchen with Granite Counter',
          caption: 'Parallel modular kitchen layout with soft-close Blum drawers and piped gas connection.',
          category: 'interior',
        },
        {
          id: 'crown-a1204-photo-3',
          url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Master Bedroom Suite',
          caption: '11x14 ft master bedroom with dedicated wardrobe niche and wooden textured tile flooring.',
          category: 'interior',
        },
        {
          id: 'crown-a1204-photo-4',
          url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Balcony Hill View (12th Floor)',
          caption: 'Unobstructed morning sunrise and Kharghar hills view from private deck.',
          category: 'view',
        },
        {
          id: 'crown-a1204-photo-5',
          url: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Architectural 2 BHK Floor Plan Schematic',
          caption: '685 sq.ft carpet layout: Living 11x18, Kitchen 8x10, Master Bed 11x14, Guest Bed 10x11.',
          category: 'floorplan',
        },
      ]),
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200',
        'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
      ]),
      isHotDeal: true,
      isExclusive: true,
    },
    // 1: Crown Heights (Kharghar 35 - 3BHK Luxury)
    {
      projectId: projectCrown.id,
      unitNumber: 'B-1801',
      bhk: 3,
      bathrooms: 3,
      balconies: 3,
      floorNumber: 18,
      totalFloors: 22,
      carpetAreaSqft: 1050,
      facing: 'NORTH_EAST',
      possessionStatus: 'READY_TO_MOVE',
      possessionDate: new Date('2024-06-01'),
      agreementValue: 10500000,
      stampDutyRate: 6.0,
      registrationFee: 30000,
      gstRate: 0.0,
      floorRiseCharges: 270000,
      parkingCharges: 350000,
      societyDevelopmentCharges: 300000,
      allInTotalCost: 12080000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: brokerSafwan.id,
      lastVerifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      verificationNotes: 'Physical broker audit done. Premium corner 3BHK.',
      description: 'Exclusive 18th-floor corner 3 BHK with 270-degree panoramic views of Kharghar Valley and CIDCO Golf Course. Triple balconies, 3 attached designer bathrooms, and 2 reserved covered stilt parkings.',
      featureHighlightsJson: JSON.stringify([
        'Corner unit with 270-degree cross-ventilation',
        'Rooftop infinity pool and gymnasium access',
        'Master suite with glass walk-in wardrobe section',
        'Ready to Move with 0% GST',
      ]),
      floorPlanUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&auto=format&fit=crop&q=80',
      videoReelUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      mediaGalleryJson: JSON.stringify([
        {
          id: 'crown-b1801-video-1',
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          kind: 'video',
          title: 'Safwan\'s 90s Tour: 3 BHK Penthouse-style Layout',
          caption: 'Corner 3 BHK with private entry vestibule and 18th floor golf view deck.',
          posterUrl: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&auto=format&fit=crop&q=80',
          duration: '1:30',
          hostName: 'Safwan Diwan',
          hostRole: 'Senior Kharghar Property Specialist',
          category: 'walkthrough',
        },
      ]),
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
      ]),
      isHotDeal: false,
      isExclusive: true,
    },
    // 2: Sai Marvel (Kharghar 35 - 2BHK Under Construction)
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
      gstRate: 5.0,
      floorRiseCharges: 96000,
      parkingCharges: 250000,
      societyDevelopmentCharges: 150000,
      allInTotalCost: 6742000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: brokerSafwan.id,
      lastVerifiedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      verificationNotes: 'Slab 14 casting in progress. Sample flat ready for inspection.',
      description: 'Well-proportioned 2 BHK on the 7th floor with open west exposure and abundant cross-ventilation. Features an L-shaped modular kitchen, false ceiling with ambient LED cove lighting, and dedicated wardrobe niches in both bedrooms.',
      featureHighlightsJson: JSON.stringify([
        'West Facing with unhindered sunset valley views',
        'Sample flat ready for physical walkthrough inspection',
        'Modular kitchen with piped gas connection point',
        'Full height sliding French balcony windows',
        'Verified All-In statutory pricing with confirmed 5% GST',
      ]),
      floorPlanUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&auto=format&fit=crop&q=80',
      videoReelUrl: 'https://www.youtube.com/embed/ScMzIvxBSi4',
      mediaGalleryJson: JSON.stringify([
        {
          id: 'sai-marvel-m703-video-1',
          url: 'https://www.youtube.com/embed/ScMzIvxBSi4',
          kind: 'video',
          title: 'Safwan\'s 75s Walkthrough: Sai Marvel 2 BHK Sample Flat Tour',
          caption: 'Watch Safwan Diwan tour the 2 BHK layout, modular kitchen, and French balcony deck.',
          posterUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80',
          duration: '1:15',
          hostName: 'Safwan Diwan',
          hostRole: 'Senior Navi Mumbai Advisor',
          category: 'walkthrough',
        },
        {
          id: 'sai-marvel-m703-photo-1',
          url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Living Room with Ambient Lighting & French Doors',
          caption: 'Spacious living & dining space with vitrified tiles and French sliding glass balcony doors.',
          category: 'interior',
        },
        {
          id: 'sai-marvel-m703-photo-2',
          url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'L-Shaped Modular Kitchen & Utility',
          caption: 'Granite countertop with stainless steel sink, soft-close cabinets, and piped gas provision.',
          category: 'interior',
        },
        {
          id: 'sai-marvel-m703-photo-3',
          url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Master Bedroom Suite with Wooden Finish Floor',
          caption: 'Master bedroom with attached western-style designer bathroom and large slider window.',
          category: 'interior',
        },
        {
          id: 'sai-marvel-m703-photo-4',
          url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Luxury Bathroom with Glass Shower Cubicle',
          caption: 'Anti-skid premium vitrified tiles and branded CP bath fittings (Jaquar/Kohler).',
          category: 'interior',
        },
        {
          id: 'sai-marvel-m703-photo-5',
          url: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: '2 BHK Architectural Layout & Dimension Plan',
          caption: '640 sq.ft carpet: Living 11x17, Kitchen 8x10, Master Bed 11x13, Guest Bed 10x11, Balcony 5x11.',
          category: 'floorplan',
        },
      ]),
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200',
        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200',
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200',
      ]),
      isHotDeal: true,
      isExclusive: false,
    },
    // 3: Galaxy Metro (Taloja 1 - 1BHK)
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
      verifiedByUserId: brokerSuhel.id,
      lastVerifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      verificationNotes: 'Ideal first-time home buyer or investor. 250m to Metro terminal.',
      description: 'Compact and functional 1 BHK on the 4th floor directly opposite Taloja Metro Station. Low maintenance cost and high rental yield.',
      featureHighlightsJson: JSON.stringify([
        '250m walking distance to Taloja Metro Line 1',
        'Budget-friendly ₹38.32 Lakhs All-In Cost',
        'PMAY Government Subsidy eligible',
        'Gated community with 24x7 security',
      ]),
      floorPlanUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&auto=format&fit=crop&q=80',
      videoReelUrl: 'https://www.youtube.com/embed/L_LUpnjgPso',
      mediaGalleryJson: JSON.stringify([
        {
          id: 'galaxy-t1402-video-1',
          url: 'https://www.youtube.com/embed/L_LUpnjgPso',
          kind: 'video',
          title: 'Suhel\'s 45s Walkthrough: 1 BHK Under ₹40L at Taloja Metro',
          caption: 'Walkthrough with Suhel Patel highlighting 1 BHK investment ROI and Metro connectivity.',
          posterUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80',
          duration: '0:45',
          hostName: 'Suhel Patel',
          hostRole: 'Taloja Metro Specialist',
          category: 'walkthrough',
        },
      ]),
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200',
      ]),
      isHotDeal: false,
      isExclusive: false,
    },
    // 4: Galaxy Metro (Taloja 1 - 2BHK)
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
      floorRiseCharges: 72000,
      parkingCharges: 200000,
      societyDevelopmentCharges: 150000,
      allInTotalCost: 5593500,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: brokerSuhel.id,
      lastVerifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      verificationNotes: 'Physical site verified. Structural pillar framework up to 11th floor.',
      description: 'Middle floor 2 BHK on the 9th floor offering clear highway and metro views. High rental yield asset with easy access to Taloja MIDC & Kharghar node.',
      featureHighlightsJson: JSON.stringify([
        '250m to Taloja Metro Terminal (Line 1)',
        'High rental demand from corporate executives',
        'Low maintenance society structure',
        'Covered stilt parking included in All-In cost',
      ]),
      floorPlanUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&auto=format&fit=crop&q=80',
      videoReelUrl: 'https://www.youtube.com/embed/L_LUpnjgPso',
      mediaGalleryJson: JSON.stringify([
        {
          id: 'galaxy-t2905-video-1',
          url: 'https://www.youtube.com/embed/L_LUpnjgPso',
          kind: 'video',
          title: 'Suhel\'s 58s Review: 2 BHK Under ₹56L at Taloja Phase 1',
          caption: 'Compact 610 sq.ft layout with 2 full bathrooms and stilt car park.',
          posterUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80',
          duration: '0:58',
          hostName: 'Suhel Patel',
          hostRole: 'Taloja Metro Specialist',
          category: 'walkthrough',
        },
        {
          id: 'galaxy-t2905-photo-1',
          url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Galaxy Metro Heights Facade',
          caption: 'Phase 1 gated development with commercial high-street retail on ground floor.',
          category: 'exterior',
        },
        {
          id: 'galaxy-t2905-photo-2',
          url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Living Room Sample Setup',
          caption: 'Vitrified flooring with French sliding window overlooking open park.',
          category: 'interior',
        },
        {
          id: 'galaxy-t2905-photo-3',
          url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: 'Kitchen & Dining Nook',
          caption: 'Granite platform with stainless steel sink and water purifier point.',
          category: 'interior',
        },
        {
          id: 'galaxy-t2905-photo-4',
          url: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&auto=format&fit=crop&q=80',
          kind: 'image',
          title: '2 BHK Architectural Floor Plan',
          caption: '610 sq.ft carpet dimension schematic.',
          category: 'floorplan',
        },
      ]),
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200',
      ]),
      isHotDeal: false,
      isExclusive: false,
    },
    // 5: Sai Paradise (Kharghar 20 - 2BHK Ready OC)
    {
      projectId: projectParadiseKharghar.id,
      unitNumber: 'P-1101',
      bhk: 2,
      bathrooms: 2,
      balconies: 2,
      floorNumber: 11,
      totalFloors: 19,
      carpetAreaSqft: 750,
      facing: 'NORTH_EAST',
      possessionStatus: 'READY_TO_MOVE',
      possessionDate: new Date('2023-11-01'),
      agreementValue: 8800000,
      stampDutyRate: 6.0,
      registrationFee: 30000,
      gstRate: 0.0,
      floorRiseCharges: 165000,
      parkingCharges: 300000,
      societyDevelopmentCharges: 250000,
      allInTotalCost: 10073000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      verifiedByUserId: brokerSuhel.id,
      lastVerifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      verificationNotes: 'Physical audit completed. Ready possession with active society maintenance.',
      description: 'Ultra-prime 11th floor 2 BHK facing Central Park Boulevard. Ready to move with 0% GST. Features Italian marble, expansive living room with double balconies, and full access to Olympic-sized pool and tennis courts.',
      featureHighlightsJson: JSON.stringify([
        'Direct unobstructed view of Central Park & ISKCON Temple',
        'Full OC received • 100% Tax-Free (0% GST)',
        'Exclusive society with high NRI and senior executive density',
        'Immediate key handover upon registration',
      ]),
      floorPlanUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&auto=format&fit=crop&q=80',
      videoReelUrl: 'https://www.youtube.com/embed/9No-FiEInLA',
      mediaGalleryJson: JSON.stringify([
        {
          id: 'paradise-p1101-video-1',
          url: 'https://www.youtube.com/embed/9No-FiEInLA',
          kind: 'video',
          title: 'Suhel\'s 90s Tour: Central Park Boulevard 2 BHK Ready OC',
          caption: 'Ready possession 2 BHK on Central Park Boulevard with Olympic pool access.',
          posterUrl: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1200&auto=format&fit=crop&q=80',
          duration: '1:30',
          hostName: 'Suhel Patel',
          hostRole: 'Kharghar Sector 20 Specialist',
          category: 'walkthrough',
        },
      ]),
      photoGalleryJson: JSON.stringify([
        'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1200',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
      ]),
      isHotDeal: true,
      isExclusive: true,
    },
  ];

  const createdUnits = [];
  for (const u of unitsData) {
    const unit = await prisma.propertyUnit.create({ data: u });
    createdUnits.push(unit);
  }

  // 7. Organic Inbound Campaigns with Exact Source Codes
  const campaignTalojaShort = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'YouTube Short: 1 BHK Under ₹40L at Taloja Metro',
      channelType: 'YOUTUBE_SHORT',
      contentId: 'yt-short-taloja-40l',
      sourceCode: 'TALOJA21',
      targetProjectId: projectGalaxyTaloja.id,
      targetPropertyUnitId: createdUnits[3].id,
      assignedBrokerId: brokerSuhel.id,
      customSlug: 'yt-taloja-under40l',
      waPrefilledText: 'Hi ZamZam Properties, saw your YouTube Short for Taloja Metro 1BHK. Code: TALOJA21. Please send price sheet.',
      totalClicks: 1420,
      totalLeadsGenerated: 88,
      isActive: true,
    },
  });

  const campaignMarvelReview = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'YouTube Review: Sai Marvel 2 BHK Sample Flat Tour',
      channelType: 'YOUTUBE_VIDEO',
      contentId: 'yt-sai-marvel-tour',
      sourceCode: 'MARVEL35',
      targetProjectId: projectSaiMarvel.id,
      targetPropertyUnitId: createdUnits[2].id,
      assignedBrokerId: brokerSafwan.id,
      customSlug: 'yt-sai-marvel-35',
      waPrefilledText: 'Hi ZamZam Properties, saw your video for Sai Marvel Kharghar Sector 35. Code: MARVEL35. Looking for 2BHK sample tour.',
      totalClicks: 980,
      totalLeadsGenerated: 52,
      isActive: true,
    },
  });

  const campaignCrownReel = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'Instagram Reel: Crown Heights Ready OC 2BHK Valley View',
      channelType: 'INSTAGRAM_REEL',
      contentId: 'ig-reel-crown-oc',
      sourceCode: 'CROWN12',
      targetProjectId: projectCrown.id,
      targetPropertyUnitId: createdUnits[0].id,
      assignedBrokerId: brokerSafwan.id,
      customSlug: 'ig-crown-valley',
      waPrefilledText: 'Hi ZamZam, saw your Reel for Crown Heights 2BHK. Code: CROWN12. Need all-in cost breakdown with 0% GST.',
      totalClicks: 750,
      totalLeadsGenerated: 41,
      isActive: true,
    },
  });

  const campaignParadiseDirect = await prisma.inboundCampaign.create({
    data: {
      organizationId: org.id,
      campaignName: 'Direct Inbound: Central Park Boulevard Luxury Units',
      channelType: 'DIRECT_CALL',
      contentId: 'direct-central-park',
      sourceCode: 'PARADISE20',
      targetProjectId: projectParadiseKharghar.id,
      targetPropertyUnitId: createdUnits[5].id,
      assignedBrokerId: brokerSuhel.id,
      customSlug: 'direct-paradise-20',
      waPrefilledText: 'Hi ZamZam Properties, interested in ready 2 BHK near Central Park. Code: PARADISE20.',
      totalClicks: 320,
      totalLeadsGenerated: 25,
      isActive: true,
    },
  });

  // 8. Durable Contacts and Multi-Channel Identities
  // Contact 1: Rahul Sharma (WhatsApp Exact -> Safwan)
  const contactRahul = await prisma.contact.create({
    data: {
      organizationId: org.id,
      primaryName: 'Rahul Sharma',
      assignedBrokerId: brokerSafwan.id,
      lifecycleStage: 'CLOSED_CLIENT',
      notes: 'Closed 2 BHK at Sai Marvel. Verified buyer via WhatsApp.',
    },
  });
  await prisma.contactIdentity.createMany({
    data: [
      { contactId: contactRahul.id, identityType: 'PHONE_E164', identityValue: '+919820199887', isPrimary: true },
      { contactId: contactRahul.id, identityType: 'WHATSAPP_WAID', identityValue: '919820199887' },
      { contactId: contactRahul.id, identityType: 'EMAIL', identityValue: 'rahul.sharma@example.com' },
    ],
  });

  // Contact 2: Vikram Mehta (YouTube Exact -> Safwan)
  const contactVikram = await prisma.contact.create({
    data: {
      organizationId: org.id,
      primaryName: 'Vikram Mehta',
      assignedBrokerId: brokerSafwan.id,
      lifecycleStage: 'ACTIVE_BUYER',
      notes: 'Active portal user. Scheduled physical visit for Saturday.',
    },
  });
  await prisma.contactIdentity.createMany({
    data: [
      { contactId: contactVikram.id, identityType: 'PHONE_E164', identityValue: '+919820566778', isPrimary: true },
      { contactId: contactVikram.id, identityType: 'WHATSAPP_WAID', identityValue: '919820566778' },
      { contactId: contactVikram.id, identityType: 'EMAIL', identityValue: 'vikram.mehta@example.com' },
    ],
  });

  // Contact 3: Priya Iyer (Instagram Exact -> Safwan)
  const contactPriya = await prisma.contact.create({
    data: {
      organizationId: org.id,
      primaryName: 'Priya Iyer',
      assignedBrokerId: brokerSafwan.id,
      lifecycleStage: 'VISITOR',
      notes: 'Inspected Crown Heights. Inquired via Instagram Reel code CROWN12.',
    },
  });
  await prisma.contactIdentity.createMany({
    data: [
      { contactId: contactPriya.id, identityType: 'INSTAGRAM_IGID', identityValue: 'priya_iyer_realty', isPrimary: true },
      { contactId: contactPriya.id, identityType: 'PHONE_E164', identityValue: '+919820233445' },
    ],
  });

  // Contact 4: Amitabh Sen (Taloja Investor -> Suhel)
  const contactAmitabh = await prisma.contact.create({
    data: {
      organizationId: org.id,
      primaryName: 'Amitabh Sen',
      assignedBrokerId: brokerSuhel.id,
      lifecycleStage: 'PROSPECT',
      notes: 'Inquired about Taloja 1 BHK under ₹40L via YouTube Short code TALOJA21.',
    },
  });
  await prisma.contactIdentity.createMany({
    data: [
      { contactId: contactAmitabh.id, identityType: 'PHONE_E164', identityValue: '+919820344556', isPrimary: true },
      { contactId: contactAmitabh.id, identityType: 'WHATSAPP_WAID', identityValue: '919820344556' },
    ],
  });

  // Contact 5: Dr. Sameer Deshpande (Direct Call -> Suhel)
  const contactSameer = await prisma.contact.create({
    data: {
      organizationId: org.id,
      primaryName: 'Dr. Sameer Deshpande',
      assignedBrokerId: brokerSuhel.id,
      lifecycleStage: 'CLOSED_CLIENT',
      notes: 'Direct phone call inquiry to Suhel Patel. Booked Central Park 2BHK.',
    },
  });
  await prisma.contactIdentity.createMany({
    data: [
      { contactId: contactSameer.id, identityType: 'PHONE_E164', identityValue: '+919820455667', isPrimary: true },
    ],
  });

  // 9. Inbound Leads with Strict Broker Ownership & Source Confidence
  const lead1 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      contactId: contactRahul.id,
      fullName: 'Rahul Sharma',
      phoneE164: '+919820199887',
      email: 'rahul.sharma@example.com',
      city: 'Navi Mumbai',
      leadSource: 'WHATSAPP_EXACT',
      sourceConfidence: 'EXACT',
      sourceCode: 'MARVEL35',
      inboundNumber: '+917977552011',
      campaignId: campaignMarvelReview.id,
      assignedBrokerId: brokerSafwan.id,
      currentStage: 'closed_won',
      firstResponseSlaMinutes: 3,
      firstResponseAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      notes: 'Came via YouTube Short with code MARVEL35 to Safwan Diwan (+917977552011). Booked 2BHK.',
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      contactId: contactPriya.id,
      fullName: 'Priya Iyer',
      phoneE164: '+919820233445',
      email: 'priya.iyer@example.com',
      city: 'Mumbai (Chembur)',
      leadSource: 'INSTAGRAM_EXACT',
      sourceConfidence: 'EXACT',
      sourceCode: 'CROWN12',
      inboundNumber: '+917977552011',
      campaignId: campaignCrownReel.id,
      assignedBrokerId: brokerSafwan.id,
      currentStage: 'visit_done',
      firstResponseSlaMinutes: 4,
      firstResponseAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      notes: 'Instagram DM referral on Reel with code CROWN12. Negotiating floor rise waiver with Safwan.',
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      contactId: contactAmitabh.id,
      fullName: 'Amitabh Sen',
      phoneE164: '+919820344556',
      email: 'amitabh.sen@example.com',
      city: 'Pune',
      leadSource: 'YOUTUBE_EXACT',
      sourceConfidence: 'EXACT',
      sourceCode: 'TALOJA21',
      inboundNumber: '+919967731071',
      campaignId: campaignTalojaShort.id,
      assignedBrokerId: brokerSuhel.id,
      currentStage: 'discovery_call',
      firstResponseSlaMinutes: 2,
      firstResponseAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      notes: 'WhatsApp inquiry to Suhel Patel (+919967731071) with code TALOJA21. Investor looking for rental yield.',
    },
  });

  const lead4 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      contactId: contactSameer.id,
      fullName: 'Dr. Sameer Deshpande',
      phoneE164: '+919820455667',
      email: 'dr.sameer@example.com',
      city: 'Navi Mumbai (Vashi)',
      leadSource: 'PHONE_ORGANIC_UNKNOWN',
      sourceConfidence: 'UNKNOWN',
      inboundNumber: '+919967731071',
      campaignId: campaignParadiseDirect.id,
      assignedBrokerId: brokerSuhel.id,
      currentStage: 'closed_won',
      firstResponseSlaMinutes: 1,
      firstResponseAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      notes: 'Direct phone call to Suhel Patel (+919967731071). Closed 2BHK booking in Sai Paradise Sector 20.',
    },
  });

  const lead5 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      contactId: contactVikram.id,
      fullName: 'Vikram Mehta',
      phoneE164: '+919820566778',
      email: 'vikram.mehta@example.com',
      city: 'Thane',
      leadSource: 'WHATSAPP_EXACT',
      sourceConfidence: 'EXACT',
      sourceCode: 'MARVEL35',
      inboundNumber: '+917977552011',
      campaignId: campaignMarvelReview.id,
      assignedBrokerId: brokerSafwan.id,
      currentStage: 'visit_scheduled',
      firstResponseSlaMinutes: 3,
      firstResponseAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: 'Tour scheduled for upcoming Saturday with pickup at Kharghar station by Safwan.',
    },
  });

  // 10. Buyer Requirements
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
      budgetMin: 3500000,
      budgetMax: 5500000,
      bhkPreferencesJson: JSON.stringify([1, 2]),
      targetLocationsJson: JSON.stringify(['Taloja Phase 1', 'Kharghar Sector 35']),
      possessionPreference: 'UNDER_CONSTRUCTION',
      minCarpetSqft: 400,
      loanPreApproved: false,
      purpose: 'investment',
      floorPreference: 'middle',
    },
  });

  await prisma.buyerRequirement.create({
    data: {
      leadId: lead5.id,
      budgetMin: 5500000,
      budgetMax: 7500000,
      bhkPreferencesJson: JSON.stringify([2]),
      targetLocationsJson: JSON.stringify(['Kharghar Sector 35', 'Taloja Phase 1']),
      possessionPreference: 'ANY',
      minCarpetSqft: 600,
      loanPreApproved: true,
      purpose: 'self_use',
      floorPreference: 'middle',
    },
  });

  // 11. Client Portals & Telemetry Logs
  const portalVikram = await prisma.clientPortal.create({
    data: {
      organizationId: org.id,
      leadId: lead5.id,
      token: 'vikram-mehta-2bhk-plfk',
      title: 'Curated 2 BHK Properties for Vikram Mehta',
      customMessage: 'Hello Vikram! 😊 Based on your requirement for a spacious 2 BHK with valley views and quick Metro access, here are your curated options in Kharghar Sector 35 and Taloja Phase 1.',
      createdById: brokerSafwan.id,
      totalViews: 14,
      lastViewedAt: new Date(Date.now() - 10 * 60 * 1000),
      portalUnits: {
        create: [
          { propertyUnitId: createdUnits[2].id, displayOrder: 1, isFeatured: true, brokerHighlight: '🔥 Safwan\'s Top Recommendation • 350m to Metro' },
          { propertyUnitId: createdUnits[0].id, displayOrder: 2, isFeatured: false, brokerHighlight: '🟢 100% Ready-to-Move with OC (0% GST)' },
          { propertyUnitId: createdUnits[4].id, displayOrder: 3, isFeatured: false, brokerHighlight: 'High Rental Yield • Taloja Metro Terminal' },
        ],
      },
    },
  });

  await prisma.portalTelemetryLog.createMany({
    data: [
      { portalId: portalVikram.id, actionType: 'PORTAL_OPEN', dwellTimeSec: 25 },
      { portalId: portalVikram.id, unitId: createdUnits[2].id, actionType: 'VIDEO_PLAY', dwellTimeSec: 75 },
      { portalId: portalVikram.id, unitId: createdUnits[2].id, actionType: 'PHOTO_SWIPE', dwellTimeSec: 40 },
      { portalId: portalVikram.id, unitId: createdUnits[2].id, actionType: 'BROCHURE_DOWNLOAD', dwellTimeSec: 10 },
      { portalId: portalVikram.id, unitId: createdUnits[2].id, actionType: 'VISIT_BOOKING_CLICK', dwellTimeSec: 20 },
    ],
  });

  // 12. Site Visits
  const visit1 = await prisma.siteVisit.create({
    data: {
      organizationId: org.id,
      leadId: lead2.id,
      assignedBrokerId: brokerSafwan.id,
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
      feedbackNotes: 'Liked Crown Heights A-1204. Wants 5% discount on clubhouse charges.',
      feedbackRating: 5,
      feedbackOutcome: 'HIGH_INTEREST',
    },
  });

  const visit2 = await prisma.siteVisit.create({
    data: {
      organizationId: org.id,
      leadId: lead5.id,
      assignedBrokerId: brokerSafwan.id,
      scheduledDate: new Date('2026-08-22'),
      timeSlot: 'Saturday 10:30 AM',
      pickupLocation: 'Central Park Metro Station',
      cabDetails: 'Innova Crysta MH-46-XY-8899',
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
      feedbackNotes: 'Client travelling from Thane with family. Prefers morning slot.',
      feedbackRating: 4,
      feedbackOutcome: 'HIGH_INTEREST',
    },
  });

  // 13. Deal Transactions & Commissions Ledger
  const deal1 = await prisma.dealTransaction.create({
    data: {
      organizationId: org.id,
      leadId: lead1.id,
      propertyUnitId: createdUnits[2].id, // Sai Marvel 2BHK (₹56.00L)
      developerProjectId: projectSaiMarvel.id,
      closingBrokerId: brokerSafwan.id,
      dealStatus: 'PAYMENT_RECEIVED',
      agreementValue: 5600000,
      brokeragePercent: 3.0,
      grossBrokerageAmount: 168000,
      repCommissionAmount: 84000, // 50% rep split
      firmNetBrokerageAmount: 84000,
      paymentReceivedDate: new Date('2026-08-14'),
      notes: 'Deal closed within 14 days of YouTube Short inquiry. Standard 3% brokerage.',
    },
  });

  const deal2 = await prisma.dealTransaction.create({
    data: {
      organizationId: org.id,
      leadId: lead4.id,
      propertyUnitId: createdUnits[5].id, // Sai Paradise 2BHK (₹88.00L)
      developerProjectId: projectParadiseKharghar.id,
      closingBrokerId: brokerSuhel.id,
      dealStatus: 'PAYMENT_RECEIVED',
      agreementValue: 8800000,
      brokeragePercent: 2.0,
      grossBrokerageAmount: 176000,
      repCommissionAmount: 88000,
      firmNetBrokerageAmount: 88000,
      paymentReceivedDate: new Date('2026-08-12'),
      notes: 'Full payment received from Paradise Group. Commission settled with Suhel Patel.',
    },
  });

  console.log('✅ Comprehensive Seed Completed Successfully!');
  console.log('- 1 Organization (ZamZam Properties Real Estate Advisory)');
  console.log('- 4 Staff Users (Admin, Safwan Diwan, Suhel Patel, Telecaller Aisha)');
  console.log('- 2 Licensed Broker Numbers: Safwan (+917977552011), Suhel (+919967731071)');
  console.log('- 4 Developer Projects & 6 Property Units with Rich Media & Host Reels');
  console.log('- 4 Organic Inbound Campaigns (TALOJA21, MARVEL35, CROWN12, PARADISE20)');
  console.log('- 5 Durable Contacts & Identities with Multi-Channel Mapping');
  console.log('- 5 Inbound Leads with Speed-to-Lead SLAs & Exact/Inferred Attribution');
  console.log('- 1 Tokenized Client Portal (vikram-mehta-2bhk-plfk) & Telemetry Stream');
  console.log('- 2 Multi-Project Site Visits & Itineraries');
  console.log('- 2 Closed Deals totaling ₹3,44,000 in Gross Brokerage');
}

main()
  .catch((e) => {
    console.error('❌ Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
