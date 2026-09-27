#!/usr/bin/env node
import { dirname, relative, sep } from "node:path";
import { scanDiskTree } from "./disk-scan.ts";
import type { DiskEntry } from "./disk-scan.ts";
import { diskSidebarRows, renderDiskView, sortDiskContents } from "./disk-view.ts";
import type { DiskSort, DiskView } from "./disk-view.ts";

const help = `DUSK  /  terminal disk usage explorer

Usage: dusk [directory] [--snapshot] [--help]

  --snapshot  Print a plain-text frame (also used without a TTY)
  --help      Show this help

Keys: j/k or arrows move, Enter/right open, Backspace/left go up,
      s change sort (size/name/count), r rescan, q or Ctrl-C quit.

Sizes are apparent file bytes (not allocated blocks). Symbolic links are
listed but never followed; hard-linked files count at each path.
`;
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(help);
} else {
  const unknown = args.find((arg) => arg.startsWith("-") && arg !== "--snapshot");
  const paths = args.filter((arg) => !arg.startsWith("-"));
  if (unknown !== undefined || paths.length > 1) {
    process.stderr.write(`Invalid arguments. Run dusk --help for usage.\n`);
    process.exitCode = 2;
  } else {
    const requestedPath = paths[0] ?? ".";
    const scan = scanDiskTree(requestedPath);
    if (scan.kind === "error") {
      process.stderr.write(`${scan.message}\n`);
      process.exitCode = 1;
    } else {
      let state: DiskView = { root: scan.root, current: scan.root, selected: 0, scroll: 0, sort: "size" };
      const snapshot = args.includes("--snapshot") || !process.stdin.isTTY || !process.stdout.isTTY;
      function viewport(): { width: number; height: number } {
        // SAFETY: Node returns undefined on non-TTY streams; scriptc needs that case in the read type.
        return {
          width: Math.max(1, (process.stdout as { columns?: number }).columns ?? 100),
          height: Math.max(1, (process.stdout as { rows?: number }).rows ?? 32),
        };
      }
      function draw(): void {
        const { width, height } = viewport();
        const frame = renderDiskView(state, width, height, !snapshot);
        process.stdout.write(snapshot ? frame : `\x1b[H${frame}\x1b[J`);
      }
      function keepSelectionVisible(): void {
        const { height } = viewport();
        const slots = Math.max(1, diskSidebarRows(height));
        if (state.selected < state.scroll) state = { ...state, scroll: state.selected };
        if (state.selected >= state.scroll + slots) state = { ...state, scroll: state.selected - slots + 1 };
      }
      function locateDirectory(root: DiskEntry, path: string): DiskEntry {
        let directory = root;
        const tail = relative(root.path, path);
        if (tail === "") return directory;
        for (const name of tail.split(sep)) {
          const next = directory.children.find((entry) => entry.kind === "directory" && entry.name === name);
          if (next === undefined) break;
          directory = next;
        }
        return directory;
      }
      function goUp(): void {
        if (state.current === state.root) return;
        const parent = locateDirectory(state.root, dirname(state.current.path));
        const index = sortDiskContents(parent, state.sort).findIndex((entry) => entry.path === state.current.path);
        state = { ...state, current: parent, selected: Math.max(0, index), scroll: 0 };
        keepSelectionVisible();
      }
      function rescan(): void {
        const updated = scanDiskTree(state.root.path);
        if (updated.kind === "error") return;
        const current = locateDirectory(updated.root, state.current.path);
        const oldSelected = sortDiskContents(state.current, state.sort)[state.selected]?.name;
        const index = sortDiskContents(current, state.sort).findIndex((entry) => entry.name === oldSelected);
        state = { ...state, root: updated.root, current, selected: Math.max(0, index), scroll: 0 };
        keepSelectionVisible();
      }
      function key(command: string): boolean {
        const contents = sortDiskContents(state.current, state.sort);
        if (command === "q" || command === "Q" || command === "\x03") return false;
        if (command === "j" || command === "\x1b[B") {
          state = { ...state, selected: Math.min(contents.length - 1, state.selected + 1) };
          state = { ...state, selected: Math.max(0, state.selected) };
          keepSelectionVisible();
        } else if (command === "k" || command === "\x1b[A") {
          state = { ...state, selected: Math.max(0, state.selected - 1) };
          keepSelectionVisible();
        } else if (command === "\r" || command === "\n" || command === "\x1b[C") {
          const chosen = contents[state.selected];
          if (chosen?.kind === "directory") state = { ...state, current: chosen, selected: 0, scroll: 0 };
        } else if (command === "\x7f" || command === "\b" || command === "\x1b[D") {
          goUp();
        } else if (command === "s") {
          const selectedPath = contents[state.selected]?.path;
          const next: DiskSort = state.sort === "size" ? "name" : state.sort === "name" ? "count" : "size";
          state = { ...state, sort: next, selected: Math.max(0, sortDiskContents(state.current, next).findIndex((entry) => entry.path === selectedPath)) };
          keepSelectionVisible();
        } else if (command === "r") rescan();
        draw();
        return true;
      }
      if (snapshot) {
        draw();
      } else {
        // The terminal resource is owned here: always restore raw mode and cursor.
        process.stdin.setRawMode(true);
        process.stdout.write("\x1b[?1049h\x1b[?25l");
        let closed = false;
        function close(): void {
          if (closed) return;
          closed = true;
          process.stdin.setRawMode(false);
          process.stdout.write("\x1b[0m\x1b[?25h\x1b[?1049l");
        }
        process.on("exit", close);
        process.on("SIGTERM", () => { close(); process.exit(0); });
        process.on("SIGINT", () => { close(); process.exit(0); });
        let lastSize = viewport();
        setInterval(() => {
          const size = viewport();
          if (size.width !== lastSize.width || size.height !== lastSize.height) {
            lastSize = size;
            keepSelectionVisible();
            draw();
          }
        }, 200);
        let pending = "";
        process.stdin.on("data", (chunk: Buffer) => {
          pending += chunk.toString("utf8");
          while (pending.length > 0) {
            let command = pending.charAt(0);
            if (command === "\x1b" && pending.length === 1) break;
            if (command === "\x1b" && pending.charAt(1) === "[") {
              if (pending.length < 3) break;
              command = pending.slice(0, 3);
            }
            pending = pending.slice(command.length);
            if (!key(command)) { close(); process.exit(0); return; }
          }
        });
        draw();
      }
    }
  }
}
