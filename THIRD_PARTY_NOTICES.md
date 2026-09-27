# Third-party notices

The `dusk` source code is licensed under the MIT License; see [LICENSE](LICENSE). The standalone executable is linked with the [scriptc](https://github.com/vercel-labs/scriptc) runtime (Apache-2.0). Copies of applicable license texts and notices are included in [LICENSES/](LICENSES/) and must accompany redistributed executable builds.

The scriptc runtime source distribution identifies the following vendored components and their licenses. A particular executable includes only components selected by its build and linked runtime features; these notices are provided with dusk distributions for attribution and license compliance.

| Component | License / notice |
| --- | --- |
| scriptc runtime | Apache-2.0 — [license text](LICENSES/Apache-2.0.txt) |
| mbed TLS | Apache-2.0 — [license and dual-license notice](LICENSES/Apache-2.0-mbedtls.txt) |
| libucontext-derived Linux musl shim | ISC — [notice](LICENSES/ISC-libucontext.txt) |
| Ryū number conversion | Boost Software License 1.0 — [license text](LICENSES/Boost-1.0-Ryu.txt) |
| QuickJS-ng (scriptc dynamic mode) | MIT — [license text](LICENSES/MIT-QuickJS-NG.txt) |
| zlib | zlib License — [license text](LICENSES/Zlib.txt) |

The scriptc runtime's vendoring details and upstream versions are documented in its [`vendor/README.md`](https://github.com/vercel-labs/scriptc/tree/main/packages/runtime/vendor). The build tool itself is also distributed under Apache-2.0; it is a development dependency and is not embedded in the dusk executable.
