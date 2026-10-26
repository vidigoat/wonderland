/** Origin used to absolutize share-card URLs. Vercel fills this at build when no public URL is set. */
export function siteOrigin(env: Record<string, string | undefined> = process.env): URL {
  const explicit = env.NEXT_PUBLIC_SITE_URL;
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL ?? env.VERCEL_URL;
  const raw = explicit || vercel;
  if (raw) {
    try {
      return new URL(raw.includes("://") ? raw : `https://${raw}`);
    } catch {
      return new URL("http://localhost:3000");
    }
  }
  return new URL("http://localhost:3000");
}
