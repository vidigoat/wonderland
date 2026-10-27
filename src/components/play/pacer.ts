const DEFAULT_GAP_MS = 420;

/** Pause between montage stations so a burst can be read. Reduced motion passes 0. */
export const MONTAGE_GAP_MS = DEFAULT_GAP_MS;

function defaultWait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Reveals montage events one station at a time.
 * A gap of 0 shows a whole burst on the same turn.
 */
export function createMontagePacer<T>(options: { gapMs: number; onItem: (item: T) => void; wait?: (ms: number) => Promise<void> }) {
  const wait = options.wait ?? defaultWait;
  const queue: T[] = [];
  let pumping = false;
  let closed = false;
  let resolveDone: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const settle = () => {
    if (closed && !pumping && queue.length === 0) resolveDone();
  };

  const pump = async () => {
    if (pumping) return;
    pumping = true;
    try {
      while (queue.length) {
        const count = options.gapMs > 0 ? 1 : queue.length;
        const batch = queue.splice(0, count);
        for (const item of batch) options.onItem(item);
        if (options.gapMs > 0 && queue.length) await wait(options.gapMs);
      }
    } finally {
      pumping = false;
      if (queue.length) void pump();
      settle();
    }
  };

  return {
    push(items: readonly T[]) {
      if (!items.length || closed) return;
      queue.push(...items);
      void pump();
    },
    close() {
      closed = true;
      settle();
    },
    finished,
  };
}
