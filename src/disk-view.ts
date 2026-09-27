import type { DiskEntry } from "./disk-scan.ts";
import { layoutDiskTreemap } from "./disk-treemap.ts";
import type { TreemapRect } from "./disk-treemap.ts";

/** Contents sidebar ordering; size and count sort across files and folders alike. */
export type DiskSort = "size" | "name" | "count";
/** Visible disk explorer state owned by the terminal entrypoint. */
export type DiskView = {
  readonly root: DiskEntry;
  readonly current: DiskEntry;
  readonly selected: number;
  readonly scroll: number;
  readonly sort: DiskSort;
};

/** Sort immediate disk contents without changing the scanned tree. */
export function sortDiskContents(directory: DiskEntry, order: DiskSort): DiskEntry[] {
  return [...directory.children].sort((a, b) => {
    let difference = 0;
    if (order === "size") difference = b.bytes - a.bytes;
    if (order === "count") difference = (b.files + b.folders) - (a.files + a.folders);
    if (order === "name") difference = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    return difference || a.name.localeCompare(b.name);
  });
}

/** Format apparent file bytes using binary units. */
export function formatDiskBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB", "PiB"];
  let value = bytes;
  let unit = -1;
  do { value /= 1024; unit++; } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(1)} ${units[unit]}`;
}

type Ink = 0 | 1 | 2;
type Cell = { char: string; ink: Ink };
const ansi = ["\x1b[37m", "\x1b[97m", "\x1b[90m"];

function safeText(text: string): string {
  // Only use single-column printable characters in the cell canvas.
  return text.replace(/[^\x20-\x7e↑↓→←›]/g, "?");
}

function clippedLabel(text: string, width: number): string {
  const clean = safeText(text);
  if (width < 1) return "";
  return clean.length > width ? clean.slice(0, width - 1) + "~" : clean;
}

function diskPercentage(bytes: number, total: number): string {
  if (total <= 0) return "0%";
  const share = 100 * bytes / total;
  if (share < 1 && bytes > 0) return "<1%";
  return `${Math.round(share)}%`;
}

/** Number of selectable contents sidebar rows at a terminal height. */
export function diskSidebarRows(height: number): number {
  if (height < 18) return Math.max(0, Math.floor((height - 7) / 2));
  return Math.max(0, Math.floor((height - 14) / 3));
}

/** Render a monochrome terminal frame with nested proportional treemap and contents sidebar. */
export function renderDiskView(view: DiskView, width: number, height: number, color: boolean): string {
  width = Math.max(1, Math.floor(width));
  height = Math.max(1, Math.floor(height));
  const cells: Cell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < width; x++) row.push({ char: " ", ink: 0 });
    cells.push(row);
  }
  function put(x: number, y: number, text: string, ink: Ink, limit: number): void {
    const row = cells[y];
    if (row === undefined) return;
    const clean = safeText(text);
    for (let i = 0; i < clean.length && i < limit; i++) {
      const cell = row[x + i];
      if (cell !== undefined) { cell.char = clean.charAt(i); cell.ink = ink; }
    }
  }
  function rule(y: number, x: number, length: number): void {
    for (let i = 0; i < length; i++) {
      const cell = cells[y]?.[x + i];
      if (cell !== undefined) { cell.char = "─"; cell.ink = 2; }
    }
  }
  function outline(rect: TreemapRect, ink: Ink): void {
    const { x, y, width: w, height: h } = rect;
    if (w < 2 || h < 2) return;
    for (let col = x; col < x + w; col++) {
      const top = cells[y]?.[col];
      const bottom = cells[y + h - 1]?.[col];
      if (top !== undefined) { top.char = "─"; top.ink = ink; }
      if (bottom !== undefined) { bottom.char = "─"; bottom.ink = ink; }
    }
    for (let row = y; row < y + h; row++) {
      const first = cells[row]?.[x];
      const last = cells[row]?.[x + w - 1];
      if (first !== undefined) { first.char = "│"; first.ink = ink; }
      if (last !== undefined) { last.char = "│"; last.ink = ink; }
    }
    for (const corner of [
      { x, y, char: "┌" }, { x: x + w - 1, y, char: "┐" },
      { x, y: y + h - 1, char: "└" }, { x: x + w - 1, y: y + h - 1, char: "┘" },
    ]) {
      const cell = cells[corner.y]?.[corner.x];
      if (cell !== undefined) { cell.char = corner.char; cell.ink = ink; }
    }
  }
  const entries = sortDiskContents(view.current, view.sort);
  const selected = entries[view.selected];
  const margin = width >= 60 ? 3 : 1;
  const contentWidth = Math.max(0, width - 2 * margin);
  const compact = height < 18;
  const headerY = compact ? 0 : 1;
  const rootSummary = `${formatDiskBytes(view.root.bytes)}   ${view.root.files} files`;
  put(margin, headerY, "DISKMAP", 0, contentWidth);
  if (contentWidth > rootSummary.length + 10) {
    put(width - margin - rootSummary.length, headerY, rootSummary, 0, rootSummary.length);
  }
  const tail = view.current.path.slice(view.root.path.length).replace(/^[/\\]/, "");
  const pathLabel = `${view.root.name}/${tail ? tail + "/" : ""}`;
  put(margin, compact ? 1 : 3, pathLabel, 0, contentWidth);
  rule(compact ? 2 : 5, margin, contentWidth);

  const hasMap = width >= 66 && height >= 18;
  const mapWidth = hasMap ? Math.floor(contentWidth * 0.69) : 0;
  const sidebarX = hasMap ? margin + mapWidth + 2 : margin + 2;
  const sidebarWidth = Math.max(0, width - margin - sidebarX);
  const sectionY = compact ? 3 : 7;
  const mapY = compact ? 4 : 9;
  const mapBottom = Math.max(mapY, height - (compact ? 3 : 6));
  const mapHeight = Math.max(0, mapBottom - mapY);
  if (hasMap) put(margin, sectionY, "FILE SIZES", 2, mapWidth);
  if (sidebarWidth > 0) put(sidebarX, sectionY, "CONTENTS", 2, sidebarWidth);

  function paintTile(entry: DiskEntry, rect: TreemapRect, depth: number, parentBytes: number): void {
    if (rect.width < 2 || rect.height < 2) return;
    // A one-cell gutter separates sibling tiles, even for tightly packed directories.
    const tile = { x: rect.x + 1, y: rect.y + 1, width: rect.width - 1, height: rect.height - 1 };
    if (tile.width < 2 || tile.height < 2) return;
    const active = depth === 0 && entry === selected;
    const ink: Ink = active ? 1 : 2;
    outline(tile, ink);
    const labelWidth = Math.max(0, tile.width - 4);
    if (tile.height >= 3 && labelWidth > 0) {
      const label = entry.name + (entry.kind === "directory" ? "/" : entry.kind === "link" ? "@" : "");
      put(tile.x + 2, tile.y + 1, clippedLabel(label, labelWidth), active ? 1 : 0, labelWidth);
    }
    if (tile.height >= 5 && labelWidth > 0) {
      put(tile.x + 2, tile.y + 3, formatDiskBytes(entry.bytes), active ? 0 : 2, labelWidth);
    }
    if (tile.height >= 7 && labelWidth > 0) {
      put(tile.x + 2, tile.y + tile.height - 2, diskPercentage(entry.bytes, parentBytes), ink, labelWidth);
    }
    // Nest one level: the parent tile keeps its name, size, and share visible.
    if (depth === 0 && entry.kind === "directory" && entry.children.length > 0 && tile.width >= 18 && tile.height >= 9) {
      const childArea = {
        x: tile.x + 1, y: tile.y + 4,
        width: tile.width - 2, height: tile.height - 6,
      };
      for (const child of layoutDiskTreemap(sortDiskContents(entry, "size"), childArea)) {
        paintTile(child.entry, child.rect, 1, entry.bytes);
      }
    }
  }
  if (mapHeight > 1 && mapWidth > 1) {
    const mapEntries = sortDiskContents(view.current, "size");
    for (const tile of layoutDiskTreemap(mapEntries, { x: margin - 1, y: mapY - 1, width: mapWidth, height: mapHeight })) {
      paintTile(tile.entry, tile.rect, 0, view.current.bytes);
    }
  }
  if (entries.length === 0) put(margin + 1, mapY, "(empty directory)", 2, Math.max(0, mapWidth - 2));

  if (sidebarWidth > 0) {
    const slots = diskSidebarRows(height);
    for (let row = 0; row < slots; row++) {
      const index = view.scroll + row;
      const entry = entries[index];
      if (entry === undefined) break;
      const y = mapY + row * (compact ? 2 : 3);
      const active = index === view.selected;
      const ink: Ink = active ? 1 : 2;
      const suffix = entry.kind === "directory" ? "/" : entry.kind === "link" ? "@" : "";
      if (active) put(sidebarX - 2, y, "›", 1, 1);
      put(sidebarX, y, clippedLabel(entry.name + suffix, sidebarWidth), ink, sidebarWidth);
      const percent = diskPercentage(entry.bytes, view.current.bytes);
      put(sidebarX, y + 1, formatDiskBytes(entry.bytes), ink, sidebarWidth);
      if (sidebarWidth > percent.length + 8) put(width - margin - percent.length, y + 1, percent, ink, percent.length);
    }
  }
  rule(height - (compact ? 3 : 4), margin, contentWidth);
  if (selected !== undefined) {
    put(margin, height - 2, selected.name, 0, Math.max(0, Math.floor(contentWidth * 0.55)));
    const count = selected.kind === "directory" ? `${selected.files} files` : selected.kind === "link" ? "link" : "1 file";
    const summary = `${formatDiskBytes(selected.bytes)}   ${count}`;
    if (contentWidth > summary.length) put(width - margin - summary.length, height - 2, summary, 0, summary.length);
  } else put(margin, height - 2, "No selection", 2, contentWidth);
  put(margin, height - 1, "↑ ↓ select   → / ENTER open   ← back   s sort   r refresh   Q quit", 2, contentWidth);
  const skipped = `${view.root.links} links skipped${view.root.errors ? `   ${view.root.errors} unreadable` : ""}`;
  if (contentWidth > skipped.length + 68) {
    put(width - margin - skipped.length, height - 1, skipped, 2, skipped.length);
  }

  let output = "";
  for (const row of cells) {
    let ink: Ink = 0;
    for (const cell of row) {
      if (color && cell.ink !== ink) { output += ansi[cell.ink]; ink = cell.ink; }
      output += cell.char;
    }
    if (color) output += "\x1b[0m";
    output += "\n";
  }
  return output;
}
