# Security policy

## Supported versions

Until the first stable release, security fixes are made on the latest `main` branch. Use the latest release after stable releases begin.

## Reporting a vulnerability

Please do not report security vulnerabilities in public issues. Use [GitHub's private vulnerability reporting](https://github.com/fr0ziii/dusk/security/advisories/new) to contact the maintainer privately. Include affected versions/commit, impact, and reproduction steps. You should receive an acknowledgement within seven days; we will work with you on a fix and coordinated disclosure.

If private vulnerability reporting is unavailable, contact the maintainer through the GitHub profile at [@fr0ziii](https://github.com/fr0ziii) and request a private channel.

## Security design

`dusk` is a local, read-only disk scanner. It does not transmit scanned paths or contents over a network, does not read file contents, and does not follow symbolic links. Scanning a directory can reveal filenames and sizes on the local terminal; use care when recording or sharing terminal output.
