import { lstatSync, readdirSync } from "node:fs";
import { basename, resolve, join } from "node:path";

/** A scanned filesystem entry; sizes are apparent bytes, not allocated blocks. */
export type DiskEntry = {
  readonly name: string;
  readonly path: string;
  readonly kind: "directory" | "file" | "link";
  bytes: number;
  files: number;
  folders: number;
  links: number;
  errors: number;
  children: DiskEntry[];
};

/** Scan error at the requested root, rather than a skippable child. */
export type DiskScanResult =
  | { readonly kind: "ok"; readonly root: DiskEntry }
  | { readonly kind: "error"; readonly message: string };

/** Recursively scan disk usage without following symbolic links; hard-linked files count at each path. */
export function scanDiskTree(inputPath: string): DiskScanResult {
  const rootPath = resolve(inputPath);
  try {
    if (!lstatSync(rootPath).isDirectory()) {
      return { kind: "error", message: `Root path is not a directory: ${rootPath}` };
    }
  } catch {
    return { kind: "error", message: `Cannot read root path: ${rootPath}` };
  }

  function scanDirectory(path: string, name: string): DiskEntry {
    const result: DiskEntry = {
      name, path, kind: "directory", bytes: 0, files: 0, folders: 1,
      links: 0, errors: 0, children: [],
    };
    let names: string[];
    try {
      names = readdirSync(path);
    } catch {
      result.errors++;
      return result;
    }
    for (const childName of names) {
      const childPath = join(path, childName);
      try {
        const stats = lstatSync(childPath);
        let child: DiskEntry;
        if (stats.isSymbolicLink()) {
          child = { name: childName, path: childPath, kind: "link", bytes: 0,
            files: 0, folders: 0, links: 1, errors: 0, children: [] };
        } else if (stats.isDirectory()) {
          child = scanDirectory(childPath, childName);
        } else {
          child = { name: childName, path: childPath, kind: "file", bytes: stats.size,
            files: 1, folders: 0, links: 0, errors: 0, children: [] };
        }
        result.children.push(child);
        result.bytes += child.bytes;
        result.files += child.files;
        result.folders += child.folders;
        result.links += child.links;
        result.errors += child.errors;
      } catch {
        result.errors++;
      }
    }
    return result;
  }

  return { kind: "ok", root: scanDirectory(rootPath, basename(rootPath) || rootPath) };
}
