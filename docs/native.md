# Native acceleration policy

The runtime may use Rust binaries through Node-API (N-API) for heavy, **pure** functions.
Native code is always optional: every accelerated function has a TypeScript implementation
that ships in the package and is used whenever the binary cannot load.

## Why not accelerate the hot path

Profiling the DOM benchmark showed that the time is spent in DOM mutations, layout and the
reactive graph — work that crosses the JS/DOM boundary or runs per effect. Calling into Rust
for those operations costs more than it saves:

- each N-API call has marshalling overhead of roughly 0.1–1 µs;
- the reactive graph needs to read and write JS objects that V8 already optimizes;
- DOM nodes cannot be passed to Rust without an FFI-safe representation.

So there is **no native code in `reactive` or `dom` today**, and none is planned for
per-item or per-effect paths. FFI is reserved for bulk work over large inputs where a single
call replaces thousands of JS operations.

## Contract

Every accelerated export follows the same shape:

```ts
// packages/<pkg>/src/<feature>.ts
import { native } from "@kyneticweb/native";

export function escapeHtml(text: string): string {
    return native?.escapeHtml(text) ?? escapeHtmlJs(text);
}
```

Rules:

1. **TS first.** The TypeScript implementation is the reference. It must pass the same tests
   and stay readable; it is not dead code.
2. **Optional loading.** The loader tries the platform binary once, lazily, and caches the
   result. A missing package, a wrong ABI, a corrupt `.node` file or a disabled flag all end
   in the same silent fallback.
3. **Same semantics.** UTF-8/UTF-16 boundaries, surrogate pairs, `undefined` versus `null`,
   exceptions and numeric precision must match the TS version. The native test suite runs
   both implementations and compares results.
4. **No hidden globals.** Native functions receive and return JSON-compatible values. They
   never hold references to signals, owners, elements or callbacks.
5. **Opt-out.** `KYNETIC_NATIVE=0` forces the TS path. `KYNETIC_NATIVE=1` makes a missing
   binary a startup error, which is useful in CI for the native job.
6. **No required install.** Binaries live in `optionalDependencies`; installing the package
   on an unsupported platform must never fail.

## Package layout

```
packages/native/
├── src/
│   ├── index.ts        # loader, flag handling, cached modules
│   └── fallback/       # TypeScript reference implementations
├── native/             # napi-rs crate (Cargo.toml, src/lib.rs)
├── test/               # parity tests: native vs fallback
└── package.json        # optionalDependencies per platform
```

The loader resolves, in order:

1. `KYNETIC_NATIVE=0` → fallback.
2. `@kyneticweb/native-<platform>-<arch>` (for example `native-win32-x64`).
3. A local build in `packages/native/native/*.node` (development only).
4. Fallback.

## What qualifies

A function is a candidate when all of these hold:

- it is pure and works on strings, typed arrays or plain numbers;
- inputs are large enough that one call amortizes the boundary (roughly > 100 kB of text or
  > 10 000 elements);
- a profile shows it as a real hotspot, not a guess;
- a TypeScript version can be written in a few dozen clear lines.

Candidates, in priority order:

| Candidate | Why it fits | Status |
| --- | --- | --- |
| HTML escaping and attribute serialization | Bulk string work, used by every SSR response | Pending measurement |
| Keyed list diff for very large lists | Pure index computation over ids, no DOM access | Pending measurement |
| Message compilation (i18n) | Parsing and interpolation over message catalogs at build time | Pending measurement |
| Template compilation | Build-time work, could move to a Rust CLI instead of N-API | Future |

Rejected: DOM patching, effect scheduling, signal reads/writes, event dispatch, hydration
walks, style normalization.

## Acceptance gate

A native path is merged only when:

1. the workload is at least **2× faster** than the TS implementation in a microbenchmark;
2. the end-to-end benchmark improves by at least **5 %** (otherwise the complexity is not
   justified);
3. tests pass with the binary **and** with `KYNETIC_NATIVE=0`;
4. the published package still installs and runs on a platform without a prebuilt binary.

Anything below the gate stays in TypeScript.

## Build and release

- Build with `npm run build:native` (napi-rs, `--release`).
- CI builds a matrix of `win32-x64`, `linux-x64-gnu`, `linux-arm64-gnu`, `darwin-x64` and
  `darwin-arm64`; each artifact contains one `.node` file.
- Prebuilt packages are published as `@kyneticweb/native-<platform>-<arch>` and referenced
  from `optionalDependencies`.
- The release job also runs the full test suite with `KYNETIC_NATIVE=0` to prove the
  fallback still works.
- `scripts/smoke.mjs` imports every package with native loading disabled, so a broken binary
  can never block a release.

## Current status

Node 24 provides Node-API version 10 and Rust 1.97 is available in the development
environment, so the toolchain is ready. No function has passed the acceptance gate yet; the
first target is SSR escaping, measured against `renderToString` on a large document.
