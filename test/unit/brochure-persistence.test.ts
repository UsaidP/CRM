import { describe, it, expect } from 'bun:test';
import { matchFloorPlansForUnit } from '@/lib/services/brochure-persistence';
import { resolveAssetUrl } from '@/lib/inventory-media';

describe('brochure-persistence: BHK floor plan matching', () => {
  const plans = [
    { id: 'fp1', url: 'https://cdn.example.com/1bhk.jpg', bhk: 1 },
    { id: 'fp2', url: 'https://cdn.example.com/2bhk.jpg', bhk: 2 },
    { id: 'fp3', url: 'https://cdn.example.com/2bhk-b.jpg', bhk: 2 },
    { id: 'fp4', url: 'https://cdn.example.com/3bhk.jpg', bhk: 3 },
  ];

  it('matches only floor plans with the same BHK', () => {
    const matched = matchFloorPlansForUnit(2, plans);
    expect(matched.length).toBe(2);
    expect(matched.map((p) => p.id)).toEqual(['fp2', 'fp3']);
  });

  it('returns EMPTY (never broadcasts) when no BHK match exists', () => {
    const matched = matchFloorPlansForUnit(4, plans);
    expect(matched).toEqual([]);
  });

  it('matches string/number BHK coercibly', () => {
    const stringBhkPlans = [{ id: 'fpX', url: 'x.jpg', bhk: '3' as unknown as number }];
    expect(matchFloorPlansForUnit(3, stringBhkPlans).length).toBe(1);
  });

  it('handles plans without bhk metadata (no match)', () => {
    const noBhk = [{ id: 'fpY', url: 'y.jpg' }];
    expect(matchFloorPlansForUnit(2, noBhk as any)).toEqual([]);
  });
});

describe('brochure-persistence: URL resolution from asset shapes', () => {
  it('resolves through nested mediaAsset wrappers', () => {
    expect(resolveAssetUrl({ mediaAsset: { secureUrl: 'https://cdn.example.com/a.jpg' } })).toBe(
      'https://cdn.example.com/a.jpg'
    );
    expect(resolveAssetUrl({ secureUrl: 'https://cdn.example.com/b.jpg' })).toBe('https://cdn.example.com/b.jpg');
    expect(resolveAssetUrl('https://cdn.example.com/c.jpg')).toBe('https://cdn.example.com/c.jpg');
    expect(resolveAssetUrl(undefined)).toBe('');
  });
});
