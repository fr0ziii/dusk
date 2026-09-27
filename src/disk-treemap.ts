import type { DiskEntry } from "./disk-scan.ts";

/** Integer terminal-cell rectangle with nonnegative dimensions. */
export type TreemapRect = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
/** One visible tile in a proportional treemap. */
export type TreemapTile = { readonly entry: DiskEntry; readonly rect: TreemapRect };

/** Lay out sorted disk entries in squarified rows, with no overlapping terminal cells. */
export function layoutDiskTreemap(entries: readonly DiskEntry[], area: TreemapRect): TreemapTile[] {
  const tiles: TreemapTile[] = [];
  if (area.width < 1 || area.height < 1 || entries.length === 0) return tiles;
  const weights = entries.map((entry) => Math.max(1, entry.bytes));
  let remainingWeight = 0;
  for (const weight of weights) remainingWeight += weight;
  let left = area.x;
  let top = area.y;
  let width = area.width;
  let height = area.height;
  let index = 0;

  while (index < entries.length && width > 0 && height > 0) {
    const across = width >= height;
    const longSide = across ? width : height;
    const shortSide = across ? height : width;
    let end = index + 1;
    let rowWeight = weights[index] ?? 0;
    function worstAspect(nextEnd: number, total: number): number {
      const thickness = total / remainingWeight * shortSide;
      let worst = 0;
      for (let i = index; i < nextEnd; i++) {
        const length = (weights[i] ?? 0) / total * longSide;
        // Terminal cells are roughly twice as tall as they are wide.
        const ratio = length / (thickness * 2);
        worst = Math.max(worst, ratio, 1 / ratio);
      }
      return worst;
    }
    while (end < entries.length) {
      const nextWeight = rowWeight + (weights[end] ?? 0);
      if (worstAspect(end + 1, nextWeight) > worstAspect(end, rowWeight)) break;
      rowWeight = nextWeight;
      end++;
    }
    // With just one cell on the short side, put all remaining items in one strip.
    if (shortSide === 1) {
      end = entries.length;
      rowWeight = remainingWeight;
    }
    const lastRow = end === entries.length;
    const thickness = lastRow ? shortSide : Math.max(1, Math.min(shortSide - 1, Math.round(shortSide * rowWeight / remainingWeight)));
    let consumed = 0;
    let previous = 0;
    for (let i = index; i < end; i++) {
      consumed += weights[i] ?? 0;
      const next = i === end - 1 ? longSide : Math.round(longSide * consumed / rowWeight);
      const length = next - previous;
      const entry = entries[i];
      if (entry !== undefined && length > 0) {
        tiles.push({ entry, rect: across
          ? { x: left + previous, y: top, width: length, height: thickness }
          : { x: left, y: top + previous, width: thickness, height: length } });
      }
      previous = next;
    }
    if (across) { top += thickness; height -= thickness; }
    else { left += thickness; width -= thickness; }
    remainingWeight -= rowWeight;
    index = end;
  }
  return tiles;
}
