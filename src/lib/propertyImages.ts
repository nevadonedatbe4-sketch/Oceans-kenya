// Centralized property image normalization.
// Accepts images in any of the shapes the app may receive and produces a
// single ordered list of { url, alt } objects.

export interface NormalizedImage {
  url: string;
  alt: string;
}

const FALLBACK_IMAGE =
  'https://readdy.ai/api/search-image?query=Modern%20luxury%20real%20estate%20property%20exterior%20clean%20white%20walls%20large%20windows%20bright%20daylight%20architectural%20photography%20high%20quality%20warm%20neutral%20background%20professional%20real%20estate%20photo&width=800&height=600&seq=hp-property-fallback&orientation=landscape';

interface NormalizeInput {
  coverImage?: string | null;
  mainImage?: string | null;
  images?: unknown[] | null;
  title?: string;
}

function extractUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidate =
      record.url ?? record.src ?? record.image_url ?? record.imageUrl;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

export function normalizePropertyImages(input: NormalizeInput): NormalizedImage[] {
  const { coverImage, mainImage, images, title } = input;
  const result: NormalizedImage[] = [];
  const seen = new Set<string>();

  const push = (raw: string | null | undefined) => {
    const clean = raw ? raw.trim() : '';
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    result.push({
      url: clean,
      alt: title ? `${title} — photo ${result.length + 1}` : `Property photo ${result.length + 1}`,
    });
  };

  // Explicit cover image first, then main image, then the ordered gallery.
  push(coverImage);
  push(mainImage);
  if (Array.isArray(images)) {
    for (const img of images) {
      push(extractUrl(img));
    }
  }

  if (result.length === 0) {
    result.push({ url: FALLBACK_IMAGE, alt: title || 'Property' });
  }

  return result;
}