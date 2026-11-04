# Releasing

The repository uses [Changesets](https://github.com/changesets/changesets) to version and publish
the packages. Every package is ESM-only and declares `publishConfig.access = public`; the root
package is private and is never published.

## Requirements

- Node.js 20 or newer.
- npm 11.15 or newer (npm 12 recommended) for staged-publishing commands.
- A member of the `@kyneticweb` npm organisation with a valid session (`npm whoami`).
- Accounts protected with a passkey instead of a TOTP authenticator need a granular access
  token with **Bypass 2FA** enabled, or must approve staged publishes from the npm website.

## 1. Prepare the release

```bash
npm login
npm run clean
npm run build
npm run typecheck
npm test
npm run lint
npm run format:check
npm run smoke
```

`npm run smoke` packs every package and fails when the tarball is missing an entry point or ships
build metadata, so it is the final packaging gate.

## 2. Describe the change

```bash
npx changeset
```

Commit the generated file together with the implementation. `npm run version` applies the bumps
when the release is prepared.

## 3. Publish

```bash
git status                 # must be clean
npm run release            # builds and publishes to the "latest" tag
```

Published versions are tagged in git locally. Push them with `git push --follow-tags`.

### If npm stages the publish

npm can place a version in its staging area instead of publishing it directly (staged
publishing). `npm publish` then fails with:

```
E409 Conflict - Cannot publish over previously staged version "x.y.z"
```

Review and approve the staged version with 2FA:

```bash
npx npm@12 stage list
npx npm@12 stage view <stage-id>
npx npm@12 stage approve <stage-id>     # prompts for 2FA
```

Or, with a passkey, open npmjs.com → **Staged Packages** → **Approve**. For a brand-new
package, npm publishes a public `0.0.0-stage` placeholder until the real version is approved.

A rejected staged version must be re-published:

```bash
npx npm@12 stage reject <stage-id>
```

The `stage` commands require npm 11.15+ and Node 22.14+ (npm 12 also needs Node 24.15+).

## 4. Keep the beta tag in sync

```bash
npm dist-tag add @kyneticweb/utils@0.1.0 beta
npm dist-tag add @kyneticweb/container@0.2.0 beta
npm dist-tag add @kyneticweb/counter@0.2.0 beta
npm dist-tag add @kyneticweb/versions@0.2.0 beta
npm dist-tag add @kyneticweb/parser@0.2.0 beta
npm dist-tag add @kyneticweb/console@0.2.0 beta
npm dist-tag add @kyneticweb/core@0.1.0 beta
```

## 5. Deprecate the broken 0.1.x betas

The 0.1.x beta builds of `console`, `container`, `counter` and `versions` pointed `main` to
`dist/src/index.js`, which the build no longer produces. They cannot be imported.

```bash
npm deprecate @kyneticweb/console@0.1.6 "Broken build: main points to a missing file. Use 0.2.0."
npm deprecate @kyneticweb/container@0.1.5 "Broken build: main points to a missing file. Use 0.2.0."
npm deprecate @kyneticweb/counter@0.1.4 "Broken build: main points to a missing file. Use 0.2.0."
npm deprecate @kyneticweb/versions@0.1.4 "Broken build: main points to a missing file. Use 0.2.0."
```

The root package never contained code:

```bash
npm deprecate @kyneticweb/libs@1.0.3 "Empty package. Install the specific libraries instead, e.g. @kyneticweb/core."
npm deprecate @kyneticweb/libs@1.0.1 "Empty package. Install the specific libraries instead, e.g. @kyneticweb/core."
```

## 6. Verify

```bash
npm view @kyneticweb/core version
npm view @kyneticweb/console version dist-tags
npm view @kyneticweb/utils version
```

## Rollback

npm does not allow republishing a version. A broken release is handled by publishing a patched
version and marking the faulty one as deprecated:

```bash
npm deprecate @kyneticweb/<package>@<version> "Broken release. Use <fixed-version>."
```
