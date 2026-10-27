/** How far a scroller must move so a target sits inside its visible box. */
export function scrollDelta(targetTop: number, targetBottom: number, viewTop: number, viewBottom: number, pad = 12): number {
  if (targetBottom > viewBottom - pad) return targetBottom - (viewBottom - pad);
  if (targetTop < viewTop + pad) return targetTop - (viewTop + pad);
  return 0;
}

/** Bring a notebook control into the scrolling page, not merely into the window. */
export function bringIntoView(target: HTMLElement | null) {
  if (!target) return;
  const scroller = target.closest<HTMLElement>(".notebook-scroll");
  if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 1) {
    target.scrollIntoView({ block: "nearest" });
    return;
  }
  const targetBox = target.getBoundingClientRect();
  const viewBox = scroller.getBoundingClientRect();
  const delta = scrollDelta(targetBox.top, targetBox.bottom, viewBox.top, viewBox.bottom);
  if (delta === 0) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scroller.scrollBy({ top: delta, behavior: reduce ? "auto" : "smooth" });
}
