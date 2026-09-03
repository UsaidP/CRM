import { describe, it, expect } from 'bun:test';
import { parseInventoryContent, resolveAssetUrl, parseGalleryUrls } from '@/lib/inventory-media';

describe('Media Deduplication & Asset Resolution', () => {
  it('correctly resolves asset URLs across strings and objects', () => {
    expect(resolveAssetUrl('https://res.cloudinary.com/test/image.jpg')).toBe('https://res.cloudinary.com/test/image.jpg');
    expect(resolveAssetUrl({ url: 'https://cdn.example.com/photo.png' })).toBe('https://cdn.example.com/photo.png');
    expect(resolveAssetUrl({ secureUrl: 'https://secure.example.com/fp.jpg' })).toBe('https://secure.example.com/fp.jpg');
    expect(resolveAssetUrl({ mediaAsset: { secureUrl: 'https://secure.example.com/asset.jpg' } })).toBe('https://secure.example.com/asset.jpg');
    expect(resolveAssetUrl(null)).toBe('');
  });

  it('parses gallery URLs cleanly from JSON string and arrays', () => {
    const jsonStr = JSON.stringify(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
    expect(parseGalleryUrls(jsonStr)).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
    expect(parseGalleryUrls(['https://b.com/1.jpg'])).toEqual(['https://b.com/1.jpg']);
    expect(parseGalleryUrls(null)).toEqual([]);
  });

  it('parses structured media fields in parseInventoryContent', () => {
    const record = {
      id: 'unit-1',
      elevationImagesJson: JSON.stringify([{ url: 'https://cdn.com/elev1.jpg', title: 'Front Elevation' }]),
      floorPlanImagesJson: JSON.stringify([{ url: 'https://cdn.com/fp1.jpg', title: '2 BHK Plan', bhk: 2 }]),
      brochurePhotosJson: JSON.stringify([{ url: 'https://cdn.com/photo1.jpg', title: 'Lobby' }]),
      videosJson: JSON.stringify([{ url: 'https://cdn.com/video1.mp4', title: 'Walkthrough' }]),
      photoGalleryJson: JSON.stringify(['https://cdn.com/p1.jpg', 'https://cdn.com/p2.jpg']),
    };

    const parsed = parseInventoryContent(record as any);
    expect(parsed.elevationImages).toHaveLength(1);
    expect(parsed.elevationImages[0].url).toBe('https://cdn.com/elev1.jpg');
    expect(parsed.floorPlanImages).toHaveLength(1);
    expect(parsed.floorPlanImages[0].bhk).toBe(2);
    expect(parsed.videos).toHaveLength(1);
    expect(parsed.videos[0].url).toBe('https://cdn.com/video1.mp4');
    expect(parsed.photoGallery).toEqual(['https://cdn.com/p1.jpg', 'https://cdn.com/p2.jpg']);
  });

  it('survives malformed JSON in every media field without throwing', () => {
    const record = {
      id: 'unit-broken',
      elevationImagesJson: '{ broken json',
      floorPlanImagesJson: 'not json at all',
      videosJson: '[[[',
      photoGalleryJson: undefined,
    };
    const parsed = parseInventoryContent(record as any);
    expect(parsed.elevationImages).toEqual([]);
    expect(parsed.floorPlanImages).toEqual([]);
    expect(parsed.videos).toEqual([]);
  });

  it('returns fallbacks (not undefined) for non-array JSON values', () => {
    const record = {
      id: 'unit-nonarray',
      elevationImagesJson: JSON.stringify({ url: 'https://x.com/a.jpg' }), // object, not array
      photoGalleryJson: JSON.stringify({ nested: true }),
    };
    const parsed = parseInventoryContent(record as any);
    expect(parsed.elevationImages).toEqual([]);
    // Non-array JSON string round-trips as a single raw-string gallery entry
    expect(parsed.photoGallery).toEqual(['{"nested":true}']);
  });

  it('parses a legacy photoGallery and preserves duplicate URLs (no dedup in parser)', () => {
    const gallery = JSON.stringify([
      'https://cdn.com/same.jpg',
      'https://cdn.com/same.jpg',
      '',
      null,
    ]);
    const parsed = parseInventoryContent({ id: 'u', photoGalleryJson: gallery } as any);
    // Empty/falsy entries are filtered, but genuine duplicates pass through —
    // dedup happens at the DB/storage layer, not here.
    expect(parsed.photoGallery).toEqual(['https://cdn.com/same.jpg', 'https://cdn.com/same.jpg']);
  });

  it('falls back to a legacy videoReelUrl when videosJson is empty', () => {
    const parsed = parseInventoryContent({
      id: 'u',
      videosJson: '[]',
      videoReelUrl: 'https://youtube.com/watch?v=abc',
    } as any);
    expect(parsed.videos).toHaveLength(1);
    expect(parsed.videos[0].url).toBe('https://youtube.com/watch?v=abc');
  });

  it('prefers explicit mediaGallery fields over re-parsing JSON', () => {
    const explicit = [{ id: 'm1', url: 'https://cdn.com/explicit.jpg', kind: 'image' as const }];
    const parsed = parseInventoryContent({
      id: 'u',
      mediaGallery: explicit,
      mediaGalleryJson: JSON.stringify(['https://cdn.com/legacy.jpg']),
    } as any);
    expect(parsed.mediaGallery).toBe(explicit);
  });

  it('resolveAssetUrl edge cases: whitespace, nested file_url, unknown shapes', () => {
    expect(resolveAssetUrl('  https://cdn.com/pad.jpg  ')).toBe('https://cdn.com/pad.jpg');
    expect(resolveAssetUrl({ file_url: 'https://docs.google.com/file.pdf' })).toBe('https://docs.google.com/file.pdf');
    expect(resolveAssetUrl({ secure_url: 'https://cdn.com/snake.jpg' })).toBe('https://cdn.com/snake.jpg');
    expect(resolveAssetUrl({})).toBe('');
    expect(resolveAssetUrl(42)).toBe('');
    expect(resolveAssetUrl({ mediaAsset: { file_url: 'https://nested.com/f.mp4' } })).toBe('https://nested.com/f.mp4');
  });

  it('parseGalleryUrls handles a bare non-JSON string and a single object', () => {
    expect(parseGalleryUrls('https://cdn.com/plain.jpg')).toEqual(['https://cdn.com/plain.jpg']);
    expect(parseGalleryUrls({ url: 'https://cdn.com/obj.jpg' })).toEqual(['https://cdn.com/obj.jpg']);
    // Non-array JSON string is kept as the raw string entry
    expect(parseGalleryUrls('{"notAnArray":true}')).toEqual(['{"notAnArray":true}']);
    expect(parseGalleryUrls(0)).toEqual([]);
  });
});
