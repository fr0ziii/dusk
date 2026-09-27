# dusk

[![CI](https://github.com/fr0ziii/dusk/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fr0ziii/dusk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A minimal, monochrome terminal disk-usage explorer. `dusk` scans a directory, lays its contents out as a proportional treemap, and lets you explore the largest files and folders from the keyboard. It is written in TypeScript and compiled to a standalone native executable with [scriptc](https://github.com/vercel-labs/scriptc).

## Features

- Recursive apparent-size scanning and file, folder, and symlink counts.
- Proportional, nested treemap and sortable contents sidebar with size percentages.
- Keyboard navigation, selection details, rescan, and terminal-resize handling.
- Compact list view for smaller terminals and plain-text snapshots for scripts.
- Read-only scan; symbolic links are listed but never followed.

## Requirements

- Node.js 24 or newer and npm 10.x (`packageManager` pins npm 10.9.4 for reproducible installs).
- A platform supported by [scriptc](https://github.com/vercel-labs/scriptc); native builds need the platform's supported linker and SDK/toolchain.
- A terminal for interactive mode. Node.js is sufficient for development and snapshots.

## Build and run

```sh
npm install --global npm@10.9.4
npm ci
npm run build
./dusk [directory]
```

The build writes a standalone executable named `dusk` in the project root. Run `./dusk --help` to see command options and keys. On Windows, run the generated `dusk.exe` from PowerShell or Command Prompt.

For development without compiling:

```sh
npm start -- [directory]
```

To produce a stable, plain-text frame (or when piping output):

```sh
./dusk [directory] --snapshot
./dusk [directory] --snapshot > usage.txt
```

## Keyboard controls

| Key | Action |
| --- | --- |
| `↑` / `↓`, `k` / `j` | Select previous / next entry |
| `Enter` / `→` | Open selected folder |
| `Backspace` / `←` | Return to parent folder |
| `s` | Cycle size, name, and item-count sorting |
| `r` | Rescan the root directory |
| `q` / `Ctrl-C` | Quit |

## Disk-size semantics and limitations

Sizes are **apparent file bytes**, not allocated disk blocks. Directory metadata is excluded. Symbolic links have zero counted bytes and are never followed; hard-linked files count once per path. Unreadable descendants are skipped and reported. A scan is a point-in-time snapshot; press `r` to refresh it.

Scanning is synchronous and currently loads the scanned tree into memory. Use a narrower starting directory for very large filesystems. The treemap gives terminal cells to the largest entries first; very small entries may not have a visible tile or label, but remain available in the contents list.

## Development

```sh
npm install --global npm@10.9.4
npm ci
npm run check       # TypeScript typecheck and tests
npm run build       # Compile the standalone executable
npm audit           # Check the locked dependency tree for known advisories
```

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Bugs and ideas belong in [GitHub Issues](https://github.com/fr0ziii/dusk/issues). Security issues should be reported privately; see [SECURITY.md](SECURITY.md).

## License

The `dusk` source is [MIT](LICENSE) © 2026 David Iglesias. Executables link the scriptc runtime; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for required third-party notices and license texts, which must accompany redistributed builds.
