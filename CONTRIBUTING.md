# Contributing to dusk

Thanks for helping improve dusk. Bug reports, focused fixes, tests, and documentation are welcome.

## Before you start

- Search existing [issues](https://github.com/fr0ziii/dusk/issues) and pull requests to avoid duplicate work.
- For a substantial change, open an issue first to discuss the problem and approach.
- For a bug report, include your OS, terminal, Node.js/scriptc versions, command, and the smallest reproducible example. Remove private paths and filenames from logs before posting.

## Local setup

Requirements: Node.js 24 or newer and npm 10. Use npm 10.9.4, as pinned by `packageManager`.

```sh
git clone https://github.com/fr0ziii/dusk.git
cd dusk
npm install --global npm@10.9.4
npm ci
npm run check
npm run build
./dusk --help
```

`npm run start -- [directory]` runs the TypeScript entrypoint directly. `npm run build` compiles the native executable and requires a supported scriptc platform toolchain.

## Pull requests

1. Keep each change focused and explain the user-visible reason.
2. Add or update tests for behavior changes. Tests should use temporary directories and real filesystem behavior; do not commit machine-specific paths or generated binaries.
3. Run `npm run check`, `npm run build`, and `npm audit` before requesting review.
4. Update the README or changelog when user-facing behavior or controls change.
5. Use a clear imperative commit subject (for example, `Handle unreadable child directories`).
6. Open a pull request with its motivation, implementation summary, and verification results. Include a terminal screenshot or snapshot output for UI changes when useful.

## Project conventions

- Keep filesystem access in the scanner/CLI boundary and layout/rendering calculations deterministic.
- Preserve the read-only scan behavior and never follow symbolic links.
- Keep TypeScript strict and avoid adding runtime dependencies without a clear need.
- `npm run check` is the local equivalent of the required CI checks. CI also builds the standalone executable and audits dependencies.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
