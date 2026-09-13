import { describe, it, expect } from 'bun:test';
import { checkReraCompliance, canTransitionStatus } from '@/lib/domain/verification-engine';
import { createProjectSchema } from '@/lib/validators/inventory-schemas';

describe('RERA Plot Threshold Compliance (Section 3(2)(a))', () => {
  describe('checkReraCompliance domain engine', () => {
    it('marks project as VERIFIED when valid MahaRERA number is supplied', () => {
      const res = checkReraCompliance({ reraNumber: 'P52000018920' });
      expect(res.isCompliant).toBe(true);
      expect(res.isExempt).toBe(false);
      expect(res.status).toBe('VERIFIED');
      expect(res.description).toContain('MahaRERA');
      expect(res.badgeLabel).toBe('MahaRERA Verified');
    });

    it('marks project as EXEMPT_PLOT_UNDER_500 when plot is <= 500 sq.m without RERA', () => {
      const res = checkReraCompliance({ reraNumber: '', plotSizeSqMeters: 450 });
      expect(res.isCompliant).toBe(true);
      expect(res.isExempt).toBe(true);
      expect(res.status).toBe('EXEMPT_PLOT_UNDER_500');
      expect(res.description).toContain('500 sq.m threshold');
      expect(res.legalBasis).toContain('Section 3(2)(a)');
    });

    it('marks project as EXEMPT_PLOT_UNDER_500 when plot is <= 5381.96 sq.ft without RERA', () => {
      const res = checkReraCompliance({ reraNumber: '', plotSizeSqFt: 4800 });
      expect(res.isCompliant).toBe(true);
      expect(res.isExempt).toBe(true);
      expect(res.status).toBe('EXEMPT_PLOT_UNDER_500');
      expect(res.legalBasis).toContain('Section 3(2)(a)');
    });

    it('marks exactly 500 sq.m as EXEMPT_PLOT_UNDER_500', () => {
      const res = checkReraCompliance({ reraNumber: '', plotSizeSqMeters: 500 });
      expect(res.isCompliant).toBe(true);
      expect(res.isExempt).toBe(true);
      expect(res.status).toBe('EXEMPT_PLOT_UNDER_500');
    });

    it('marks project as MANDATORY_MISSING when plot > 500 sq.m and RERA is omitted', () => {
      const res = checkReraCompliance({ reraNumber: '', plotSizeSqMeters: 500.5 });
      expect(res.isCompliant).toBe(false);
      expect(res.isExempt).toBe(false);
      expect(res.status).toBe('MANDATORY_MISSING');
      expect(res.description).toContain('MahaRERA registration is legally mandatory');
    });

    it('marks project as MANDATORY_MISSING when plot in sq.ft > 5381.96 and RERA is omitted', () => {
      const res = checkReraCompliance({ reraNumber: '', plotSizeSqFt: 6000 });
      expect(res.isCompliant).toBe(false);
      expect(res.isExempt).toBe(false);
      expect(res.status).toBe('MANDATORY_MISSING');
      expect(res.badgeTone).toBe('rose');
    });

    it('marks project as VERIFIED even if plot > 500 sq.m when valid RERA is supplied', () => {
      const res = checkReraCompliance({ reraNumber: 'P52000077818', plotSizeSqMeters: 2500 });
      expect(res.isCompliant).toBe(true);
      expect(res.isExempt).toBe(false);
      expect(res.status).toBe('VERIFIED');
    });

    it('marks project as NOT_UPDATED when plot is unspecified and RERA is omitted', () => {
      const res = checkReraCompliance({ reraNumber: '' });
      expect(res.isCompliant).toBe(true);
      expect(res.isExempt).toBe(false);
      expect(res.status).toBe('NOT_UPDATED');
      expect(res.description).toContain('MahaRERA registration number has not been recorded yet');
      expect(res.badgeLabel).toBe('RERA Not Updated');
    });
  });

  describe('createProjectSchema Zod validation', () => {
    const baseProjectPayload = {
      developerName: 'Shiv Developers',
      projectName: 'Shiv Residency',
      microMarket: 'Kharghar Sector 35',
      subLocality: 'Plot 4, Sector 35',
      totalTowers: 1,
      totalFloors: 7,
      basePricePerSqft: 9500,
    };

    it('allows project creation without RERA if plot size is <= 500 sq.m', () => {
      const result = createProjectSchema.safeParse({
        ...baseProjectPayload,
        plotSizeSqMeters: 450,
      });
      expect(result.success).toBe(true);
    });

    it('allows project creation without RERA if plot size is unspecified (flagged NOT_UPDATED)', () => {
      const result = createProjectSchema.safeParse({
        ...baseProjectPayload,
      });
      expect(result.success).toBe(true);
    });

    it('rejects project creation if plot size > 500 sq.m and RERA is omitted', () => {
      const result = createProjectSchema.safeParse({
        ...baseProjectPayload,
        plotSizeSqMeters: 800,
        reraNumber: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('MahaRERA registration is legally compulsory');
      }
    });

    it('rejects project creation if plot size in sq.ft > 5381.96 and RERA is omitted', () => {
      const result = createProjectSchema.safeParse({
        ...baseProjectPayload,
        plotSizeSqFt: 6500,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('MahaRERA registration is legally compulsory');
      }
    });

    it('accepts project creation if plot size > 500 sq.m and valid RERA is supplied', () => {
      const result = createProjectSchema.safeParse({
        ...baseProjectPayload,
        plotSizeSqMeters: 1200,
        reraNumber: 'P52000045678',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('canTransitionStatus inventory lifecycle governance', () => {
    it('permits ACTIVE_MARKETABLE when project has verified RERA', () => {
      const result = canTransitionStatus(
        'PHYSICALLY_AUDITED',
        'ACTIVE_MARKETABLE',
        true,
        false,
        false
      );
      expect(result.allowed).toBe(true);
    });

    it('permits ACTIVE_MARKETABLE when project is statutory exempt (plot <= 500 sq.m)', () => {
      const result = canTransitionStatus(
        'PHYSICALLY_AUDITED',
        'ACTIVE_MARKETABLE',
        false,
        true,
        false
      );
      expect(result.allowed).toBe(true);
    });

    it('permits ACTIVE_MARKETABLE when project RERA is NOT_UPDATED (unregistered inventory)', () => {
      const result = canTransitionStatus(
        'PHYSICALLY_AUDITED',
        'ACTIVE_MARKETABLE',
        false,
        false,
        false
      );
      expect(result.allowed).toBe(true);
    });

    it('blocks ACTIVE_MARKETABLE when project has mandatory violation (plot > 500 sq.m without RERA)', () => {
      const result = canTransitionStatus(
        'PHYSICALLY_AUDITED',
        'ACTIVE_MARKETABLE',
        false,
        false,
        true
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Plot size exceeds 500 sq.m where MahaRERA registration is legally compulsory');
    });

    it('rejects invalid state transition to undefined status', () => {
      const result = canTransitionStatus(
        'ARCHIVED_SOLD',
        'ACTIVE_MARKETABLE',
        true,
        false,
        false
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cannot transition directly from ARCHIVED_SOLD to ACTIVE_MARKETABLE');
    });
  });
});
