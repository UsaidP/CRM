# Phase 13 Plan: RERA Plot Threshold Governance & Unregistered Inventory Ingestion

**Phase**: 13  
**Name**: RERA Plot Threshold Governance & Unregistered Inventory Ingestion  
**Regulatory Framework**: Maharashtra Real Estate (Regulation and Development) Act, Section 3(2)(a)  
**Status**: Ready for Execution  

---

## 1. Executive Summary & Regulatory Context

Under Section 3(2)(a) of the Real Estate (Regulation and Development) Act (RERA):
> *"No registration of the real estate project shall be required where the area of land proposed to be developed does not exceed five hundred square meters or the number of apartments proposed to be developed does not exceed eight apartments."*

In local real estate operations (Navi Mumbai, Kharghar redevelopment, Taloja standalone buildings, and small CIDCO plots), many properties are built on plots under 500 sq. meters (or ~5,382 sq. ft). Furthermore, during early soft launches or private broker assignments, inventory must be added and marketed before final RERA registration is issued or updated.

Previously, the CRM enforced a hard invariant rejecting any property creation or activation without an active MahaRERA registration number.

This Phase updates the CRM data architecture, API validators, verification engine, and UI forms to:
1. **Allow properties to be created without a RERA registration number** when not legally compulsory.
2. **Implement statutory plot size threshold checks** (RERA compulsory **only if plot size > 500 sq. meters** / **> 5,382 sq. ft**).
3. **Display prominent, clear flags**:
   - **`RERA Exempt (Plot ≤ 500 sq.m)`** for small plots under statutory exemption.
   - **`RERA Not Updated`** for properties without RERA details pending verification.
   - **`MahaRERA Verified`** for properties with valid P5200... registration.
4. **Update all forms**: Add Plot Size with Sq.m / Sq.ft conversion, dynamic helper indicators, and non-blocking validation.

---

## 2. Core Domain Specifications & Invariant Updates

### 2.1 Updated Domain Invariants
* **Invariant 1 (Statutory Plot Threshold)**:
  - If $\text{Plot Size} > 500\text{ m}^2$ (or $> 5,381.96\text{ sq.ft}$), MahaRERA registration is **compulsory**. Forms and APIs must require a valid RERA number.
  - If $\text{Plot Size} \le 500\text{ m}^2$ (or $\le 5,381.96\text{ sq.ft}$), RERA registration is **exempt** under Section 3(2)(a).
* **Invariant 2 (Permissive Ingestion with Warning Flags)**:
  - Properties with unrecorded plot size or pending RERA numbers can be added and units created.
  - The system flags the project and child units as `RERA Not Updated` instead of aborting the operation.
* **Invariant 3 (Marketable Status Transitions)**:
  - Units can transition to `ACTIVE_MARKETABLE` if:
    - The project has a verified RERA number, **OR**
    - The project is statutory exempt (`isReraExempt = true` or `plotSizeSqMeters <= 500`), **OR**
    - The project is explicitly approved under broker discretion with `RERA Not Updated` warning badge displayed.

---

## 3. Detailed Work Breakdown

### Task 1: Database & Validator Updates
- Update Prisma Schema:
  - `DeveloperProject`: Add `plotSizeSqMeters Float?`, `plotSizeSqFt Float?`, `isReraExempt Boolean @default(false)`, `reraStatus String @default("NOT_UPDATED")`. Ensure `reraNumber` is optional/default empty string `""`.
  - Run database migration / push.
- Update Zod Schemas (`inventory-schemas.ts`):
  - In `createProjectSchema` and `updateProjectSchema`, make `reraNumber` optional.
  - Add `plotSizeSqMeters` and `plotSizeSqFt`.
  - Add refinement: If `plotSizeSqMeters > 500` and `!reraNumber`, trigger validation error: *"MahaRERA registration is compulsory for plot sizes exceeding 500 sq.m."*

### Task 2: Domain Verification Engine Updates (`verification-engine.ts`)
- Add `checkReraCompliance({ reraNumber, plotSizeSqMeters, plotSizeSqFt })`:
  - Returns `{ status: 'VERIFIED' | 'EXEMPT_PLOT_UNDER_500' | 'MANDATORY_MISSING' | 'NOT_UPDATED', isCompliant: boolean, badgeText: string, description: string }`.
- Update `canTransitionStatus`:
  - Allow `ACTIVE_MARKETABLE` for exempt projects (`plotSizeSqMeters <= 500`) or un-updated projects with appropriate advisory flags.

### Task 3: Backend API Routes Adaptation
- `POST /api/v1/inventory/projects`:
  - Check RERA compliance.
  - Only check duplicate `reraNumber` if `reraNumber` is provided and non-empty.
  - Store `plotSizeSqMeters`, `plotSizeSqFt`, `isReraExempt`, `reraStatus`.
- `PUT /api/v1/inventory/projects/[id]`:
  - Support updating plot size and recalculating compliance status.
- `POST /api/v1/inventory/units`:
  - Allow unit creation and verification without blocking on missing RERA.

### Task 4: UI Forms & Interactive Badges
- **`ReraVerificationBadge.tsx`**:
  - Add support for empty RERA with plot size context:
    - Display Emerald Badge: `RERA Exempt (Plot ≤ 500 sq.m)` with Section 3(2)(a) legal note.
    - Display Amber Badge: `RERA Not Updated • Pending Registration` with action button to add RERA.
- **`InventoryClient.tsx` (Add Developer Project Modal)**:
  - Add Plot Size field (number input + toggle `sq.m` / `sq.ft`).
  - Add live compliance helper:
    - Displays green checkmark if `plotSize <= 500 sq.m` indicating exemption.
    - Displays amber notice if `plotSize > 500 sq.m` indicating RERA is compulsory.
  - Remove HTML5 `required` attribute on RERA input unless plot > 500 sq.m.
- **`ProjectDetailsModal.tsx` & `BrochureUploadModal.tsx`**:
  - Update brochure save handler to remove blocking throw if RERA is absent.
  - Allow saving and reviewing un-updated RERA projects with visual indicator.

### Task 5: Testing & Verification
- Unit test suite: `test/unit/rera-plot-threshold.test.ts`.
- End-to-end API test verifying project and unit creation with:
  1. Plot size = 450 sq.m without RERA -> Allowed, flagged as `RERA Exempt (Plot ≤ 500 sq.m)`.
  2. Plot size = 800 sq.m without RERA -> Rejected with 422 (compulsory).
  3. Plot size unspecified without RERA -> Allowed, flagged as `RERA Not Updated`.
  4. Plot size = 800 sq.m with valid P52000018920 -> Allowed, flagged as `MahaRERA Verified`.
