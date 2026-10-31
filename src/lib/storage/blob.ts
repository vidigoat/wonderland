import path from "node:path";

/**
 * Where the app keeps what it writes at run time: new worlds, their paintings, playtests, plays, the study and
 * the spend ledger. On this machine, files under the project. On Vercel (WONDERLAND_STORAGE=blob), whose disk is
 * read-only, a private Vercel Blob store: private because a world holds its hidden law.
 */
export function blobStorage(): boolean {
  return process.env.WONDERLAND_STORAGE === "blob";
}

/** A folder the app may write to: the project locally, /tmp on a read-only host. */
export function writableDir(...segments: string[]): string {
  return blobStorage() ? path.join("/tmp", "wonderland", ...segments) : path.join(/* turbopackIgnore: true */ process.cwd(), ...segments);
}

export async function blobPut(pathname: string, body: string | Buffer, contentType: string, ifMatch?: string): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(pathname, body, {
    access: "private",
    contentType,
    addRandomSuffix: false,
    ...(ifMatch ? { ifMatch } : { allowOverwrite: true }),
  });
}

/** The blob's bytes and ETag, or null if it doesn't exist. Always fresh: overwrites must be seen at once. */
export async function blobGet(pathname: string): Promise<{ bytes: Buffer; etag: string } | null> {
  const { get } = await import("@vercel/blob");
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
    return { bytes, etag: result.headers.get("etag") ?? "" };
  } catch (error) {
    if ((error as { name?: string }).name === "BlobNotFoundError") return null;
    throw error;
  }
}

export async function blobGetText(pathname: string): Promise<string | null> {
  const found = await blobGet(pathname);
  return found ? found.bytes.toString("utf8") : null;
}

/** Every pathname under a prefix. */
export async function blobList(prefix: string): Promise<string[]> {
  const { list } = await import("@vercel/blob");
  const names: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    names.push(...page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return names;
}

/**
 * Read, change and write one JSON blob without losing a concurrent writer's change: the write only lands if the
 * blob is still the version that was read (its ETag), otherwise it reads again and retries.
 */
export async function blobUpdateJson<T>(pathname: string, empty: T, change: (current: T) => T): Promise<T> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const found = await blobGet(pathname);
    const current = found ? (JSON.parse(found.bytes.toString("utf8")) as T) : empty;
    const next = change(current);
    try {
      await blobPut(pathname, JSON.stringify(next), "application/json", found?.etag || undefined);
      return next;
    } catch (error) {
      const said = `${(error as { name?: string }).name ?? ""} ${String((error as Error).message)}`;
      if (!/precondition|etag mismatch|already exists/i.test(said)) throw error;
      // Someone else wrote first: back off a little, at random, and read again.
      await new Promise((resolve) => setTimeout(resolve, 40 + Math.random() * 120 * (attempt + 1)));
    }
  }
  throw new Error(`Could not update ${pathname}: too many writers at once.`);
}
