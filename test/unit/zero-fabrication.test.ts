import { describe, it, expect } from 'bun:test';
import { parseBrochureText } from '@/lib/services/brochure-parser-service';

describe('zero-fabrication: regex fallback parser', () => {
  const bareText = 'Sunrise Heights by ABC Developers. Sector 15, Taloja. Visit our sales office.';

  it('returns basePricePerSqft 0 when no price is present in the text', () => {
    const data = parseBrochureText(bareText, 'sunrise-heights.pdf');
    expect(data.basePricePerSqft).toBe(0);
  });

  it('returns empty classifiedMedia (no fabricated elevations/master plan)', () => {
    const data = parseBrochureText(bareText, 'sunrise-heights.pdf');
    expect(data.classifiedMedia.elevationsCount).toBe(0);
    expect(data.classifiedMedia.floorPlansCount).toBe(0);
    expect(data.classifiedMedia.hasMasterPlan).toBe(false);
    expect(data.classifiedMedia.elevations).toEqual([]);
    expect(data.classifiedMedia.floorPlans).toEqual([]);
  });

  it('returns no fabricated amenities, transit, plot details, structure type, or possession date', () => {
    const data = parseBrochureText(bareText, 'sunrise-heights.pdf');
    expect(data.amenities).toEqual([]);
    expect(data.transitConnectivity).toEqual([]);
    expect(data.plotDetails).toBeUndefined();
    expect(data.structureType).toBeUndefined();
    expect(Object.keys(data.specifications || {}).length).toBe(0);
    expect(data.keyHighlights.some((h: string) => h.includes('Metro Station'))).toBe(false);
    expect(data.keyHighlights.some((h: string) => h.includes('CIDCO'))).toBe(false);
    expect(data.expectedPossessionDate).toBeUndefined();
  });

  it('keeps genuinely extracted facts', () => {
    const text = 'Emerald Towers by XYZ Group. MahaRERA: P51700077818. 2 BHK 720 sq.ft. Swimming Pool and Gymnasium available. Possession December 2027.';
    const data = parseBrochureText(text, 'emerald-towers.pdf');
    expect(data.projectName.length).toBeGreaterThan(0);
    expect(data.reraNumber).toBe('P51700077818');
    expect(data.amenities.some((a: string) => a.toLowerCase().includes('swimming pool'))).toBe(true);
    expect(data.amenities.some((a: string) => a.toLowerCase().includes('gym'))).toBe(true);
    expect(data.basePricePerSqft).toBe(0); // still zero: price never stated
  });

  it('does not fabricate carpet area when only BHK is mentioned', () => {
    const data = parseBrochureText('Green Park by Builders. 1 BHK and 2 BHK available.', 'green-park.pdf');
    for (const unit of data.units) {
      expect(unit.carpetAreaSqft).toBe(0);
    }
  });
});

describe('zero-fabrication: MahaRERA certificate & form isolation', () => {
  it('does not inject City Space or City Avenue into generated PDF for non-City Avenue project', async () => {
    const { buildMahaReraCertificatePdf } = await import('@/lib/services/maharera-service');
    const pdfBuf = buildMahaReraCertificatePdf({
      reraNumber: 'P52000033333',
      projectName: 'Premier Horizon',
      developerName: 'Premier Group',
      projectType: 'RESIDENTIAL',
      districtCode: '520',
      districtName: 'Raigad / Navi Mumbai',
      microMarket: 'Taloja Phase 1',
      address: 'Sector 10, Taloja Phase 1, Panvel',
      projectStatus: 'REGISTERED',
      hasLitigations: false,
    });

    const text = pdfBuf.toString('utf-8');
    expect(text.toLowerCase()).not.toContain('city space');
    expect(text.toLowerCase()).not.toContain('city avenue');
    expect(text.toLowerCase()).toContain('premier horizon');
    expect(text.toLowerCase()).toContain('premier group');
  });

  it('dynamic statutory project record resolver does not default to City Space', async () => {
    const { searchMahaReraProject } = await import('@/lib/services/maharera-service');
    const record = await searchMahaReraProject('P52000033333', 'Premier Horizon', 'Premier Group');
    expect(record.projectName).toBe('Premier Horizon');
    expect(record.developerName).toBe('Premier Group');
    expect(record.promoterName).not.toContain('City Space');
    expect(record.isOriginalScannedDocument).toBeFalsy();
    expect(record.originalDocumentUrl).toBeUndefined();
  });

  it('downloadAndSaveMahaReraCertificate marks unverified project as PENDING_PORTAL_SYNC without fake PDF', async () => {
    const { downloadAndSaveMahaReraCertificate } = await import('@/lib/services/maharera-service');
    // Using an unregistered dummy RERA number
    const result = await downloadAndSaveMahaReraCertificate('P52000099999', 'Fake Project', 'Fake Dev', 'Fake_Project');
    
    // Must NOT fabricate a PDF
    expect(result.isAuthentic).toBe(false);
    expect(result.certificateUrl).toBeUndefined();
    expect(result.syncStatus).toBe('PENDING_PORTAL_SYNC');
    expect(result.isOriginalScannedDocument).toBe(false);
  });

  it('fetchAuthenticMahaReraCertificate validates inputs cleanly', async () => {
    const { fetchAuthenticMahaReraCertificate } = await import('@/lib/services/maharera-service');
    const result = await fetchAuthenticMahaReraCertificate('');
    expect(result.success).toBe(false);
    expect(result.error).toContain('RERA Registration Number is required');
  });
});


