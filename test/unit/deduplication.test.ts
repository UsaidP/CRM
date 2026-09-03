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
});
