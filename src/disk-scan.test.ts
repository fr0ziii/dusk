import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { scanDiskTree } from "./disk-scan.ts";
import { layoutDiskTreemap } from "./disk-treemap.ts";
import { renderDiskView, sortDiskContents } from "./disk-view.ts";

function fixture(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "dusk-test-"));
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("recursively sums file bytes and counts folders without following links", () => fixture((root) => {
  mkdirSync(join(root, "nested"));
  writeFileSync(join(root, "a"), "12345");
  writeFileSync(join(root, "nested", "b"), "123");
  symlinkSync(root, join(root, "nested", "loop"));
  const result = scanDiskTree(root);
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.deepEqual([result.root.bytes, result.root.files, result.root.folders, result.root.links, result.root.errors], [8, 2, 2, 1, 0]);
  assert.equal(result.root.children.find((entry) => entry.name === "nested")?.bytes, 3);
}));

test("invalid roots return an error instead of a crash", () => fixture((root) => {
  writeFileSync(join(root, "plain"), "x");
  assert.equal(scanDiskTree(join(root, "missing")).kind, "error");
  assert.equal(scanDiskTree(join(root, "plain")).kind, "error");
}));

test("sidebar sort and treemap preserve proportions and bounds", () => fixture((root) => {
  writeFileSync(join(root, "z"), "12345678");
  writeFileSync(join(root, "a"), "12");
  const scan = scanDiskTree(root);
  assert.equal(scan.kind, "ok");
  if (scan.kind !== "ok") return;
  assert.deepEqual(sortDiskContents(scan.root, "name").map((e) => e.name), ["a", "z"]);
  assert.deepEqual(sortDiskContents(scan.root, "size").map((e) => e.name), ["z", "a"]);
  const tiles = layoutDiskTreemap(sortDiskContents(scan.root, "size"), { x: 2, y: 3, width: 20, height: 5 });
  assert.equal(tiles.length, 2);
  assert.equal(tiles[0]?.rect.width, 16);
  assert.equal(tiles[1]?.rect.width, 4);
  assert.equal(tiles.reduce((sum, tile) => sum + tile.rect.width * tile.rect.height, 0), 100);
  const frame = renderDiskView({ root: scan.root, current: scan.root, selected: 0, scroll: 0, sort: "size" }, 80, 24, false);
  assert.equal(frame.split("\n").slice(0, -1).length, 24);
  assert.ok(frame.includes("FILE SIZES"));
  assert.ok(frame.includes("CONTENTS"));
  assert.ok(frame.includes("┌"));
  assert.ok(frame.includes("z"));
  const narrow = renderDiskView({ root: scan.root, current: scan.root, selected: 0, scroll: 0, sort: "size" }, 40, 12, false);
  assert.ok(!narrow.includes("FILE SIZES"));
  assert.ok(narrow.includes("CONTENTS"));
}));

test("large folders show nested tiles and selection in the reference layout", () => fixture((root) => {
  mkdirSync(join(root, "big"));
  writeFileSync(join(root, "big", "nested-item"), "x".repeat(4000));
  writeFileSync(join(root, "other"), "x".repeat(100));
  const scan = scanDiskTree(root);
  assert.equal(scan.kind, "ok");
  if (scan.kind !== "ok") return;
  const frame = renderDiskView({ root: scan.root, current: scan.root, selected: 0, scroll: 0, sort: "size" }, 100, 32, false);
  assert.match(frame, /FILE SIZES\s+CONTENTS/);
  assert.match(frame, /nested-item/);
  assert.match(frame, /› big\//);
  assert.match(frame, /98%/);
  const compact = renderDiskView({ root: scan.root, current: scan.root, selected: 0, scroll: 0, sort: "size" }, 40, 12, false);
  assert.ok(compact.includes("CONTENTS"));
  assert.ok(compact.includes("big/"));
  assert.ok(compact.includes("›"));
  assert.ok(!compact.includes("FILE SIZES"));
}));

test("treemap partitions each cell exactly once across narrow and empty layouts", () => fixture((root) => {
  for (let index = 0; index < 8; index++) writeFileSync(join(root, `file-${index}`), "x".repeat(index * index));
  const scan = scanDiskTree(root);
  assert.equal(scan.kind, "ok");
  if (scan.kind !== "ok") return;
  for (let width = 1; width <= 24; width++) for (let height = 1; height <= 8; height++) {
    const tiles = layoutDiskTreemap(scan.root.children, { x: 2, y: 3, width, height });
    const occupied = new Set<string>();
    for (const tile of tiles) for (let y = tile.rect.y; y < tile.rect.y + tile.rect.height; y++) {
      for (let x = tile.rect.x; x < tile.rect.x + tile.rect.width; x++) {
        assert.ok(x >= 2 && x < 2 + width && y >= 3 && y < 3 + height);
        const cell = `${x},${y}`;
        assert.ok(!occupied.has(cell), `overlapping tile at ${cell}`);
        occupied.add(cell);
      }
    }
    assert.equal(occupied.size, width * height);
  }
}));

test("CLI snapshot renders a scanned directory and reports invalid paths", () => fixture((root) => {
  writeFileSync(join(root, "visible.txt"), "hello");
  const entry = join(import.meta.dirname, "dusk.ts");
  const ok = spawnSync(process.execPath, ["--experimental-strip-types", entry, root, "--snapshot"], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /visible\.txt/);
  assert.match(ok.stdout, /5 B/);
  assert.doesNotMatch(ok.stdout, /\x1b\[/);
  const missing = spawnSync(process.execPath, ["--experimental-strip-types", entry, join(root, "missing")], { encoding: "utf8" });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Cannot read root path/);
}));
