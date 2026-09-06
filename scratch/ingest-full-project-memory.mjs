// Script to ingest full project memory into agentmemory daemon
import { execSync } from "node:child_process";

const BASE_URL = process.env.AGENTMEMORY_URL || "http://localhost:3111";
const PROJECT_PATH = "/Users/usaidpatel/Desktop/CRM";

async function postJson(endpoint, data) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} on ${endpoint}: ${text}`);
  }
  return res.json();
}

const MEMORIES = [
  // 1. Architecture & Tech Stack
  {
    title: "Technology Stack & Core Frameworks",
    type: "architecture",
    concepts: ["tech-stack", "nextjs16", "react19", "bun", "typescript", "tailwind"],
    files: ["package.json", "tsconfig.json"],
    content: "Zamzam CRM is built with Next.js 16.3+ (App Router) running on React 19 and TypeScript with Tailwind CSS. The primary package manager and runtime runner is Bun (v1.3.4). Build script runs `prisma generate && next build`."
  },
  {
    title: "Database Architecture & Supabase Dual-Connection Setup",
    type: "architecture",
    concepts: ["database-architecture", "postgresql", "supabase-pooler", "prisma-orm", "direct-url"],
    files: ["prisma/schema.prisma", ".env"],
    content: "Uses PostgreSQL hosted on Supabase with a dual-connection setup in Prisma: DATABASE_URL points to the IPv4 transaction pooler (pgbouncer on port 6543 with connection_limit=25) for high-concurrency serverless API routes, while DIRECT_URL connects to the direct session pooler (port 5432) for schema migrations and `bunx prisma db push`."
  },
  {
    title: "Multi-Tenant Isolation & Tenant Guard Architecture",
    type: "architecture",
    concepts: ["multi-tenancy", "tenant-guard", "organization-boundary", "security-isolation"],
    files: ["src/lib/db/tenant-guard.ts", "src/lib/db/tenant-context.ts", "prisma/schema.prisma"],
    content: "Every core entity (User, Contact, DeveloperProject, PropertyUnit, InboundCampaign, Lead, ClientPortal, SiteVisit, DealTransaction, LeadReminder, Team, RolePermission) is scoped by `organizationId`. Queries are wrapped with `tenant-guard.ts` and `tenant-context.ts` to strictly enforce tenant isolation and prevent cross-tenant data leaks."
  },

  // 2. Authentication, Roles & Security
  {
    title: "Authentication, JWT Session & Super Admin Key Access",
    type: "architecture",
    concepts: ["authentication", "jwt-session", "super-admin", "cookie-auth", "rbac"],
    files: ["src/lib/services/api-auth.ts", "src/lib/services/auth-service.ts", "src/app/api/v1/auth/session/route.ts"],
    content: "Authentication uses JWT signed with JWT_SECRET stored in HTTP-only session cookies. Roles: SUPER_ADMIN, ADMIN, MANAGER, AGENT, TELECALLER. A dedicated SUPER_ADMIN_KEY exists for disaster recovery and automated resets via `scripts/reset-to-superadmin.js`."
  },

  // 3. Domain: Inventory & Developer Projects
  {
    title: "Developer Projects & Property Units Data Model",
    type: "domain",
    concepts: ["developer-project", "property-unit", "inventory-management", "bhk-pricing"],
    files: ["prisma/schema.prisma", "src/app/inventory/page.tsx", "src/lib/domain/unit-differentiation.ts"],
    content: "Inventory is structured hierarchically: DeveloperProject contains metadata, RERA compliance details, location descriptions, micro-market tags (e.g. Kharghar Sector 35, Taloja Phase 1), and brochures. Each project has multiple PropertyUnits with BHK (1, 2, 3, 4), carpet area, floor number, possession status (READY_TO_MOVE vs UNDER_CONSTRUCTION), facing, agreement value, and allInTotalCost."
  },
  {
    title: "Financial Breakdown & All-In Total Cost Calculation",
    type: "domain",
    concepts: ["cost-calculator", "stamp-duty", "registration-fee", "gst", "all-in-cost"],
    files: ["src/lib/domain/cost-calculator.ts", "src/lib/money.ts"],
    content: "PropertyUnit total price calculation standardizes Maharashtra statutory costs: All-In Total Cost = agreementValue + stampDutyRate (default 6.0%) + registrationFee (₹30,000) + gstRate (default 5.0%) + floorRiseCharges + parkingCharges (default ₹2,50,000) + societyDevelopmentCharges (default ₹1,50,000)."
  },
  {
    title: "MahaRERA Statutory Verification & Zero-Fabrication Integrity",
    type: "domain",
    concepts: ["maharera-verification", "rera-certificate", "zero-fabrication", "statutory-compliance"],
    files: ["src/lib/services/maharera-service.ts", "src/app/api/v1/inventory/rera/fetch-certificate/route.ts"],
    content: "Developer projects store official MahaRERA registration number, registered title, validity date, and downloaded certificate PDF (`reraCertificateUrl`). The system strictly enforces zero-fabrication integrity: certificates and project statuses must be verified against public MahaRERA records and cannot be hallucinated or mocked."
  },

  // 4. Domain: Brochure & Media Pipeline
  {
    title: "AI Brochure Ingestion & Cloudinary Media Pipeline",
    type: "integration",
    concepts: ["brochure-parser", "cloudinary-cdn", "pdf-rasterization", "gemini-vision"],
    files: ["src/lib/services/brochure-parser-service.ts", "src/lib/services/cloud-media-service.ts", "src/lib/services/pdf-image-extractor.ts"],
    content: "Property brochures (PDF) undergo multi-page rasterization and AI parsing: Gemini models parse floor plans, amenities, key highlights, and unit matrices, while extracted images and elevation renderings are uploaded to Cloudinary CDN for optimized responsive delivery."
  },

  // 5. Domain: Leads, Attribution & Matching Engine
  {
    title: "Inbound Lead Attribution & Source Tracking",
    type: "domain",
    concepts: ["lead-attribution", "whatsapp-cloud", "instagram-graph", "campaign-tracking", "broker-lines"],
    files: ["src/lib/domain/attribution-engine.ts", "src/lib/domain/campaign-attribution.ts", "src/lib/domain/broker-resolver.ts"],
    content: "Inbound leads are attributed to specific marketing campaigns via sourceCode (e.g. TALOJA21), customSlug, or contacted broker lines (BrokerPhoneNumber). Supported channels: WhatsApp Cloud API, Instagram Reels/DMs, YouTube Shorts/Videos, Facebook Groups, and direct telephone calls."
  },
  {
    title: "Lead Lifecycle, Stages & Kanban Management",
    type: "domain",
    concepts: ["lead-lifecycle", "kanban-board", "lead-stages", "sla-tracking"],
    files: ["src/components/leads/LeadsKanbanBoard.tsx", "src/app/leads/page.tsx", "src/lib/domain/lead-auto-adjuster.ts"],
    content: "Leads progress through structured stages: new_uncontacted -> discovery_call -> portal_shared -> visit_scheduled -> visit_done -> closed_won -> closed_lost. Features First Response SLA tracking (firstResponseSlaMinutes) and automatic status transitions upon communication logging."
  },
  {
    title: "Intelligent Lead-to-Inventory Matching Engine",
    type: "domain",
    concepts: ["matching-engine", "property-matching", "buyer-requirements", "scoring-algorithm"],
    files: ["src/lib/domain/matching-engine.ts", "src/app/api/v1/matching/leads/[leadId]/route.ts"],
    content: "The matching engine correlates BuyerRequirement profiles (budget min/max, BHK preferences JSON, target micro-markets JSON, possession preference) with verified PropertyUnits in active DeveloperProjects, calculating matching scores to recommend the best curated units to brokers and buyers."
  },

  // 6. Domain: Client Portals, Site Visits & Deals
  {
    title: "Dynamic Client Portals & Telemetry Tracking",
    type: "domain",
    concepts: ["client-portal", "portal-telemetry", "buyer-engagement", "dwell-time"],
    files: ["src/app/api/v1/portals/create/route.ts", "src/app/api/v1/portals/[token]/telemetry/route.ts", "src/components/portal/PropertyCard.tsx"],
    content: "Brokers generate personalized tokenized client portals (ClientPortal) showcasing curated units. High-resolution telemetry logs (PortalTelemetryLog) record buyer dwell time, unit expansions, photo gallery swipes, brochure downloads, and WhatsApp/Call CTA clicks to identify high-intent prospects."
  },
  {
    title: "Site Visits Scheduling & Fleet Dispatcher",
    type: "domain",
    concepts: ["site-visits", "visit-dispatcher", "cab-coordination", "itinerary-planning"],
    files: ["src/lib/domain/visit-dispatcher.ts", "src/app/api/v1/visits/route.ts", "prisma/schema.prisma"],
    content: "SiteVisit manages physical property tours: tracks assigned host broker, scheduled date/time slot, pickup locations (railway stations, metro stations, client residence), cab driver details, unit visit itinerary JSON, and post-visit feedback outcomes (e.g. TOKEN_SUBMITTED, PRICE_OBJECTION)."
  },
  {
    title: "Deal Closing Ledger & Broker Commission Split",
    type: "domain",
    concepts: ["deal-closing", "commission-ledger", "brokerage-split", "revenue-accounting"],
    files: ["src/lib/domain/commission-calculator.ts", "src/app/deals/page.tsx", "src/app/api/v1/deals/route.ts"],
    content: "DealTransaction records property sales closures: agreementValue, standard brokerage percentage (2.0% - 3.0%), grossBrokerageAmount, closing rep commission split (e.g. 50% or 70%), external co-broker channel partner share, and firmNetBrokerageAmount. Statuses: TOKEN_RECEIVED, AGREEMENT_REGISTERED, INVOICE_SENT, PAYMENT_RECEIVED, CANCELLED."
  },
  {
    title: "Lead Reminders & Unified Operational Calendar",
    type: "domain",
    concepts: ["lead-reminders", "followup-calendar", "task-prioritization"],
    files: ["src/lib/services/lead-reminder-service.ts", "src/app/api/v1/reminders/route.ts"],
    content: "LeadReminder provides task and follow-up tracking for sales reps: dueAt timestamps, reminderType (CALL, WHATSAPP, SITE_VISIT_FOLLOWUP, REQUIREMENT_CHECK), priority (URGENT, HIGH, MEDIUM, LOW), and snooze capabilities integrated with Rep operational dashboards."
  },

  // 7. Integrations & External Services
  {
    title: "Google Gemini AI Integration Architecture",
    type: "integration",
    concepts: ["google-gemini", "ai-service", "brochure-extraction", "requirement-parsing"],
    files: ["src/lib/services/gemini-service.ts", ".env"],
    content: "Integrates `@google/genai` with GEMINI_API_KEY / GOOGLE_API_KEY. Powers natural language lead requirement extraction, automatic property matching explanations, and multi-modal brochure PDF parsing into structured database models."
  },
  {
    title: "Cloudinary Cloud Media CDN Storage",
    type: "integration",
    concepts: ["cloudinary", "media-storage", "cdn-delivery", "image-optimization"],
    files: ["src/lib/services/cloud-media-service.ts", ".env"],
    content: "Uses Cloudinary SDK with CLOUDINARY_URL for real estate media asset storage, asset tagging by project/unit ID, auto-format optimization, and thumbnail generation for property cards and client portals."
  },

  // 8. Guidelines, Conventions & Gotchas
  {
    title: "Next.js 16 App Router Breaking Changes Warning",
    type: "gotcha",
    concepts: ["nextjs16-conventions", "breaking-changes", "agents-md-notice"],
    files: ["AGENTS.md", "src/app/layout.tsx"],
    content: "Next.js 16 introduces breaking changes in App Router conventions, async request handling, and server action behaviors. Check `node_modules/next/dist/docs/` before updating server actions or routing. Never remove the generated Next.js notice block in AGENTS.md."
  },
  {
    title: "Database Reset & Migration Scripts Discipline",
    type: "gotcha",
    concepts: ["database-reset", "super-admin-script", "migration-safety", "db-push"],
    files: ["scripts/reset-to-superadmin.js", "scripts/reset-production.js", "scripts/clean-db.js"],
    content: "To reset local development database to a clean super admin state, run `bun db:fresh` (`bun scripts/reset-to-superadmin.js`). Remote production resets (`scripts/reset-production.js`) strictly require super admin credentials. Schema updates must use `bun db:push` (`bunx prisma db push`) using DIRECT_URL."
  },
  {
    title: "Dynamic Page Cache Disabling Policy",
    type: "convention",
    concepts: ["cache-control", "dynamic-rendering", "fresh-data", "revalidate-zero"],
    files: ["src/app/leads/page.tsx", "src/app/inventory/page.tsx"],
    content: "Leads and inventory list views enforce dynamic rendering and cache disabling (`revalidate = 0` / dynamic export) so that real-time database modifications, lead insertions, and unit verification status changes reflect immediately without browser or edge stale-cache issues."
  },
  {
    title: "Testing Architecture with Bun Test Runner",
    type: "convention",
    concepts: ["bun-test", "test-suite", "unit-tests", "api-tests", "security-tests"],
    files: ["package.json", "test/run-all-tests.js", "test/api/", "test/security/"],
    content: "The test suite is powered natively by Bun: run all tests with `bun test`, unit tests with `bun run test:unit`, API route tests with `bun run test:api`, and security/tenant isolation tests with `bun run test:security`."
  }
];

const LESSONS = [
  {
    content: "Always use the Supabase IPv4 transaction pooler (port 6543) for Next.js serverless routes, and use the direct session connection (port 5432) for Prisma schema migrations and push.",
    context: "PostgreSQL connection pooling in serverless environments",
    confidence: 0.98,
    tags: "database,supabase,prisma,pooler,postgres"
  },
  {
    content: "All database queries accessing tenant data must pass through tenant-guard or tenant-context to guarantee organizationId isolation and prevent multi-tenant data leaks.",
    context: "Multi-tenant data access security",
    confidence: 0.98,
    tags: "multi-tenancy,security,tenant-guard,organization"
  },
  {
    content: "Never hallucinate or mock MahaRERA certificates or registration numbers; statutory documents must be retrieved and validated against official public records.",
    context: "RERA statutory compliance and legal data integrity",
    confidence: 0.99,
    tags: "maharera,rera,compliance,zero-fabrication"
  },
  {
    content: "Run test suite commands using Bun (`bun test` or `bun test:unit`) rather than npm test to leverage native fast execution and proper TypeScript resolution.",
    context: "Testing and CI execution",
    confidence: 0.95,
    tags: "bun,testing,unit-tests,scripts"
  },
  {
    content: "Ensure Leads and Inventory list routes disable Next.js static caching to reflect real-time broker edits, status updates, and inbound leads immediately.",
    context: "Next.js App Router caching behavior",
    confidence: 0.95,
    tags: "nextjs,cache,leads,inventory,real-time"
  }
];

async function main() {
  console.log(`Ingesting full project memory for ${PROJECT_PATH}...`);

  let memoriesSaved = 0;
  for (const item of MEMORIES) {
    try {
      const res = await postJson("/agentmemory/remember", {
        title: item.title,
        content: item.content,
        concepts: item.concepts,
        files: item.files.map(f => `${PROJECT_PATH}/${f}`),
        project: PROJECT_PATH,
        type: item.type
      });
      memoriesSaved++;
      console.log(`[Memory ${memoriesSaved}/${MEMORIES.length}] ✓ ${item.title}`);
    } catch (err) {
      console.error(`Failed to save memory "${item.title}":`, err.message);
    }
  }

  let lessonsSaved = 0;
  for (const lesson of LESSONS) {
    try {
      const res = await postJson("/agentmemory/lessons", {
        content: lesson.content,
        context: lesson.context,
        confidence: lesson.confidence,
        project: PROJECT_PATH,
        tags: lesson.tags
      });
      lessonsSaved++;
      console.log(`[Lesson ${lessonsSaved}/${LESSONS.length}] ✓ ${lesson.tags}`);
    } catch (err) {
      console.error(`Failed to save lesson:`, err.message);
    }
  }

  // Trigger reflection to build concept clusters in the knowledge graph
  try {
    console.log("\nTriggering reflection and knowledge graph synthesis...");
    const reflectRes = await postJson("/agentmemory/reflect", { project: PROJECT_PATH, maxClusters: 10 });
    console.log("Reflection completed:", reflectRes);
  } catch (err) {
    console.warn("Reflection note:", err.message);
  }

  console.log(`\n🎉 Full project memory ingestion complete!`);
  console.log(`- Memories saved: ${memoriesSaved}`);
  console.log(`- Lessons saved: ${lessonsSaved}`);
}

main().catch(err => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
