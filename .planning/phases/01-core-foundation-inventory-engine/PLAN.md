# Phase 1 Plan: Core Foundation, Database Architecture & Verified Inventory Engine

**Phase**: 01  
**Name**: Core Foundation, Database Architecture & Verified Inventory Engine  
**Agents**: `/agency-software-architect`, `/agency-backend-architect`  
**Status**: Ready for Execution  

---

## 1. Executive Summary & Architectural Scope

Phase 1 establishes the foundational data architecture, backend service layer, and inventory engine for the ZamZam Properties CRM & Client Portal. It models the real-world operational realities of Indian real estate (Navi Mumbai micro-markets: Kharghar Sectors 1–20, Sectors 34–36, Taloja Phase 1 & 2), enforces strict MahaRERA verification invariants, calculates exact all-inclusive capitalized acquisition costs ($C_{\text{all-in}}$), and implements an automated 14-day anti-staleness engine to prevent outdated inventory from ever reaching clients.

---

## 2. Domain Decomposition & Aggregates (Domain-Driven Design)

### 2.1 Bounded Contexts
1. **Tenancy & IAM Context**: Organizations, RBAC (`SUPER_ADMIN`, `BROKER_MANAGER`, `SALES_EXECUTIVE`, `TELECALLER`).
2. **Verified Inventory Context**: Multi-Developer Projects, Property Units, MahaRERA Compliance, Media Vault, and Physical Audit Records.
3. **Financial Computation Context**: Maharashtra Statutory Tax Rules, Agreement Value, GST (Under-Construction vs. OC Exempt), Stamp Duty (Women 5% vs. Standard 6%), Floor Rise charges.
4. **Lifecycle & Quality Assurance Context**: 14-day freshness decay, re-verification alerts, archival.

### 2.2 Domain Invariants & Business Rules
* **Invariant 1 (MahaRERA Enforceability)**: No property can transition to `ACTIVE_MARKETABLE` status without a validated MahaRERA registration number (`P5200...`) and Commencement/Occupancy Certificate status.
* **Invariant 2 (All-In Cost Determinism)**: The system must always calculate and persist $C_{\text{all-in}}$ using:
  $$C_{\text{all-in}} = V_{\text{agreement}} + S_{\text{duty}} + R_{\text{eg}} + G_{\text{ST}} + F_{\text{rise}} + P_{\text{arking}} + D_{\text{ev}}$$
* **Invariant 3 (Anti-Staleness Decay)**: If `last_verified_at` exceeds 14 days without broker confirmation, the unit state transitions automatically to `STALE_EXPIRED` and is suppressed from client-facing matching algorithms.

---

## 3. Database Schema & Migration Specification (PostgreSQL + Prisma)

### 3.1 DDL Schema Definition
```sql
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE user_role_enum AS ENUM ('SUPER_ADMIN', 'BROKER_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER');
CREATE TYPE possession_type_enum AS ENUM ('READY_TO_MOVE', 'UNDER_CONSTRUCTION');
CREATE TYPE verification_status_enum AS ENUM ('DRAFT', 'RERA_VERIFIED', 'PHYSICALLY_AUDITED', 'ACTIVE_MARKETABLE', 'STALE_EXPIRED', 'ARCHIVED_SOLD');
CREATE TYPE facing_direction_enum AS ENUM ('EAST', 'WEST', 'NORTH', 'SOUTH', 'NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST');

-- 3. ORGANIZATIONS (Multi-Tenancy)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(80) UNIQUE NOT NULL,
    rera_broker_registration VARCHAR(80),
    settings JSONB DEFAULT '{"currency": "INR", "state": "Maharashtra"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. USERS & BROKERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone_e164 VARCHAR(20) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'SALES_EXECUTIVE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_org_role ON users(organization_id, role);

-- 5. DEVELOPER PROJECTS (Master Projects)
CREATE TABLE developer_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    developer_name VARCHAR(150) NOT NULL,
    project_name VARCHAR(150) NOT NULL,
    rera_number VARCHAR(100) NOT NULL,
    micro_market VARCHAR(100) NOT NULL, -- e.g., 'Kharghar Sector 35', 'Taloja Phase 1'
    sub_locality VARCHAR(100),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    distance_to_metro_km NUMERIC(4, 2),
    has_occupancy_certificate BOOLEAN NOT NULL DEFAULT FALSE,
    commencement_certificate_date DATE,
    expected_possession_date DATE,
    total_towers INT DEFAULT 1,
    total_floors INT DEFAULT 15,
    base_price_per_sqft NUMERIC(10, 2) NOT NULL,
    brochure_url TEXT,
    youtube_walkthrough_url TEXT,
    master_plan_url TEXT,
    amenities JSONB DEFAULT '[]'::jsonb,
    developer_sales_poc_name VARCHAR(120),
    developer_sales_poc_phone VARCHAR(20),
    standard_commission_percent NUMERIC(4, 2) DEFAULT 2.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_market ON developer_projects(micro_market);
CREATE INDEX idx_projects_rera ON developer_projects(rera_number);

-- 6. PROPERTY UNITS (Actionable Inventory Units)
CREATE TABLE property_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES developer_projects(id) ON DELETE CASCADE,
    unit_number VARCHAR(50),
    bhk INT NOT NULL, -- 1, 2, 3, 4
    bathrooms INT DEFAULT 2,
    balconies INT DEFAULT 1,
    floor_number INT NOT NULL,
    total_floors INT NOT NULL,
    carpet_area_sqft INT NOT NULL,
    facing facing_direction_enum DEFAULT 'EAST',
    possession_status possession_type_enum NOT NULL,
    possession_date DATE,
    
    -- Financial Slabs (INR)
    agreement_value NUMERIC(12, 2) NOT NULL,
    stamp_duty_rate NUMERIC(4, 2) DEFAULT 6.00,
    registration_fee NUMERIC(10, 2) DEFAULT 30000.00,
    gst_rate NUMERIC(4, 2) DEFAULT 5.00,
    floor_rise_charges NUMERIC(10, 2) DEFAULT 0.00,
    parking_charges NUMERIC(10, 2) DEFAULT 250000.00,
    society_development_charges NUMERIC(10, 2) DEFAULT 150000.00,
    all_in_total_cost NUMERIC(12, 2) NOT NULL,
    
    -- Verification & Freshness Lifecycle
    verification_status verification_status_enum NOT NULL DEFAULT 'DRAFT',
    verified_by_user_id UUID REFERENCES users(id),
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_notes TEXT,
    photo_gallery JSONB DEFAULT '[]'::jsonb,
    video_reel_url TEXT,
    is_hot_deal BOOLEAN DEFAULT FALSE,
    is_exclusive BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_units_bhk_cost ON property_units(bhk, all_in_total_cost);
CREATE INDEX idx_units_status_freshness ON property_units(verification_status, last_verified_at);
CREATE INDEX idx_units_project ON property_units(project_id);

-- 7. INVENTORY VERIFICATION AUDIT LOG (Immutable)
CREATE TABLE inventory_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_unit_id UUID NOT NULL REFERENCES property_units(id) ON DELETE CASCADE,
    auditor_user_id UUID NOT NULL REFERENCES users(id),
    previous_status verification_status_enum NOT NULL,
    new_status verification_status_enum NOT NULL,
    price_changed_from NUMERIC(12, 2),
    price_changed_to NUMERIC(12, 2),
    audit_notes TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Backend Service Layer & Architecture Specifications

```
src/
├── app/
│   └── api/
│       ├── v1/
│       │   ├── inventory/
│       │   │   ├── projects/route.ts        # GET (list/filter), POST (create project)
│       │   │   ├── projects/[id]/route.ts   # GET, PATCH, DELETE
│       │   │   ├── units/route.ts           # GET (all-in cost filtered query), POST
│       │   │   ├── units/[id]/route.ts      # GET, PATCH, DELETE
│       │   │   ├── units/[id]/verify/route.ts # POST audit & transition state
│       │   │   └── calculator/route.ts      # POST calculate all-in cost breakdown
│       │   └── health/route.ts              # GET system health check
├── lib/
│   ├── db/
│   │   └── prisma.ts                        # Singleton Prisma Client with connection pooling
│   ├── domain/
│   │   ├── cost-calculator.ts               # Maharashtra Statutory Cost Calculation Engine
│   │   ├── verification-engine.ts           # 14-day freshness state transitions & invariants
│   │   └── market-definitions.ts            # Navi Mumbai Micro-Market metadata & price bands
│   └── validators/
│       ├── project-schemas.ts               # Zod validation schemas
│       └── unit-schemas.ts                  # Zod validation schemas
```

### 4.1 Cost Calculator Implementation Contract
```typescript
export interface CostCalculationInput {
  agreementValue: number;
  isFemaleBuyer?: boolean;
  hasOccupancyCertificate: boolean;
  floorNumber: number;
  carpetAreaSqft: number;
  floorRisePerSqftPerFloor?: number; // default ₹50/sqft above 4th floor
  parkingCharges?: number;          // default ₹2,50,000
  societyDevCharges?: number;       // default ₹1,50,000
}

export interface CostCalculationResult {
  agreementValue: number;
  stampDutyRate: number;            // 5% if female, 6% standard
  stampDutyAmount: number;
  registrationFee: number;          // 1% capped at ₹30,000
  gstRate: number;                  // 0% if OC received, 5% if under-construction
  gstAmount: number;
  floorRiseCharges: number;
  parkingCharges: number;
  societyDevCharges: number;
  totalAllInCost: number;
  costBreakdownPercentage: {
    baseAgreement: number;
    taxesAndRegistration: number;
    amenitiesAndParking: number;
  };
}
```

### 4.2 Verification State Machine Engine
```
       ┌───────────┐
       │   DRAFT   │
       └─────┬─────┘
             │ (MahaRERA Validation)
             ▼
       ┌───────────┐
       │   RERA    │
       │ VERIFIED  │
       └─────┬─────┘
             │ (Physical Site Audit + Pricing Sheet Confirmation)
             ▼
       ┌───────────┐
       │ACTIVE_    │◄──────┐ (Re-Audit Confirm Within 14d)
       │MARKETABLE │───────┘
       └─────┬─────┘
             │ (If now() - last_verified_at > 14 Days)
             ▼
       ┌───────────┐
       │   STALE   │
       │  EXPIRED  │
       └───────────┘
```

---

## 5. Implementation Tasks Breakdown

### Task 1.1: Project Scaffolding & Database Setup
* Initialize Next.js 15 App Router codebase with TypeScript, Tailwind CSS, Prisma ORM, and Zod.
* Set up SQLite/PostgreSQL Prisma schema with relations, enums, and indexes.
* Generate Prisma Client and initialize the database migration.

### Task 1.2: Domain Engines & Validators
* Implement `src/lib/domain/cost-calculator.ts` with complete Maharashtra real estate statutory formulas.
* Implement `src/lib/domain/verification-engine.ts` with state transition invariants and staleness checker.
* Build Zod schemas in `src/lib/validators/` for input validation.

### Task 1.3: REST API Endpoints
* `POST /api/v1/inventory/calculator`: Stateless all-in cost calculation for brokers.
* `GET & POST /api/v1/inventory/projects`: Developer project catalog management.
* `GET & POST /api/v1/inventory/units`: Property units CRUD with dynamic cost pre-computation.
* `POST /api/v1/inventory/units/:id/verify`: Status transitions, audit log recording, and verification stamp.

### Task 1.4: Verified Inventory Management UI (Admin Console)
* Create interactive dashboard for Project & Unit Management.
* Add live all-in cost breakdown preview with dynamic slider adjustment.
* Add visual status indicators (🟢 Active Marketable, 🟡 Needs Re-Audit, 🔴 Stale/Expired).
* Provide 1-click "Re-Verify Unit" action for brokers with audit notes.

### Task 1.5: Seed Data & Testing Suite
* Seed authentic Navi Mumbai micro-market data:
  - Kharghar Sector 35: Premium RTM & UC high-rises (Crown Heights, Sai Marvel).
  - Kharghar Core (Sector 20): Premium resale with OC.
  - Taloja Phase 1 & Phase 2: Metro-adjacent high-growth affordable housing.
* Build automated tests verifying:
  1. Statutory cost calculations across RTM and UC units.
  2. Invariant enforcement (refusing activation without RERA number).
  3. 14-day staleness transition logic.

---

## 6. Verification & Acceptance Criteria (UAT)

1. **All-In Cost Accuracy Verification**:
   - For a ₹50,00,000 Under-Construction unit (Standard Buyer): Stamp duty (6% = ₹3.0L) + Registration (₹30K) + GST (5% = ₹2.5L) + Parking (₹2.5L) + Society Dev (₹1.5L) + Floor Rise (10th floor = ₹1.5L) $\rightarrow$ Expected Total: **₹61,80,000**.
   - For a ₹50,00,000 RTM Unit with OC: GST must evaluate to **₹0**.
2. **MahaRERA Guardrail Verification**:
   - An API request attempting to mark a property `ACTIVE_MARKETABLE` with an empty or malformed RERA ID must return `422 Unprocessable Entity`.
3. **Staleness Circuit Breaker Verification**:
   - An inventory query filtered by `status=ACTIVE_MARKETABLE` must never return a record where `last_verified_at < NOW() - INTERVAL '14 days'`.
