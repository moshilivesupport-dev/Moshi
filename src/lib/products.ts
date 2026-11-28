export type MoshiProductImage = {
  key: string | null;
  url: string;
};

export function normalizeProductImages(
  value: unknown
): MoshiProductImage[] {
  let input = value;

  if (typeof input === "string") {
    const trimmed = input.trim();

    if (!trimmed) return [];

    try {
      input = JSON.parse(trimmed);
    } catch {
      return [
        {
          key: null,
          url: trimmed,
        },
      ];
    }
  }

  if (!Array.isArray(input)) return [];

  return input
    .map((item): MoshiProductImage | null => {
      if (typeof item === "string") {
        const url = item.trim();

        return url
          ? {
              key: null,
              url,
            }
          : null;
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;

      const url = String(
        record.url || record.publicUrl || ""
      ).trim();

      if (!url) return null;

      const key =
        typeof record.key === "string" && record.key.trim()
          ? record.key.trim()
          : null;

      return {
        key,
        url,
      };
    })
    .filter(
      (image): image is MoshiProductImage => image !== null
    );
}

export function getProductImageUrls(
  value: unknown
): string[] {
  return normalizeProductImages(value).map(
    (image) => image.url
  );
}

export function getPrimaryProductImage(
  value: unknown,
  fallback?: string | null
): string | null {
  const images = normalizeProductImages(value);

  return images[0]?.url || fallback || null;
}

export function serializeProductImages(
  images: MoshiProductImage[]
): Array<{ key: string | null; url: string }> {
  return images
    .filter((image) => Boolean(image.url))
    .map((image) => ({
      key: image.key,
      url: image.url,
    }));
}