# Releasing

The repository uses [Changesets](https://github.com/changesets/changesets) and a trunk-based
flow: every change lands on `main` through a pull request, releases are prepared on a short
lived `release/<version>` branch, and publishing runs from the **Release** workflow.

## Requirements

- Node.js 20 or newer (24 recommended for publishing).
- npm 11.15 or newer (npm 12 recommended) for staged publishing.
- A member of the `@kyneticweb` npm organisation with a valid session (`npm whoami`).
- A granular npm access token with **Bypass 2FA** stored as the `NPM_TOKEN` repository secret,
  or a release manager who approves staged publishes manually.
- Permission to run the **Release** workflow (admin or maintainer).

## Versioning model

- The framework packages (`reactive`, `dom`, `router`, `i18n`, `forms`, `ssr`, `compiler`,
  `testing`, `devtools`, `ui`) are versioned together and released as a set.
- Utility packages keep independent versions.
- `patch` fixes, `minor` features, `major` breaking changes. Before 1.0 a breaking change may
  ship as `minor`, but the changeset must say so.
- The private examples and the root package are never published.

## 1. Prepare `main`

Merge every feature, fix and documentation PR first. `main` must be green:

```
CI / Node 20 · Node 22 · Node 24
```

## 2. Create the release branch

```bash
git switch main
git pull --ff-only
git switch -c release/0.2.0
```

## 3. Apply the changesets

```bash
npx changeset version     # or: npm run version
```

This consumes `.changeset/*.md`, bumps the versions and writes each package's `CHANGELOG.md`.
Review the diff:

- Versions and internal dependency ranges match the intended release.
- Changelogs mention every user-facing change.
- No unexpected package is bumped.

Update `docs/releases/vX.Y.Z.md` with the release notes. If the release is a first publication
at the current version (for example the 0.2.0 framework packages), `changeset version` may
produce no version diff; the release notes and the publish step are still required.

## 4. Open the release PR

```bash
git add -A
git commit -m "release: prepare 0.2.0"
git push -u origin release/0.2.0
```

Open a PR against `main` titled `release: 0.2.0`. CI must pass; squash-merge it.

## 5. Tag the release

Tag the squash commit on `main`:

```bash
git switch main
git pull --ff-only
git tag -a v0.2.0 -m "Kynetic 0.2.0"
git push origin v0.2.0
```

The umbrella tag records the release. Changesets also creates per-package tags
(`@kyneticweb/dom@0.1.0`) when it publishes.

## 6. Run the Release workflow

GitHub → **Actions** → **Release** → **Run workflow**:

- `publish: false` builds and tests without touching npm.
- `publish: true` runs `changeset publish`, pushes the package tags and publishes every
  version that is not on the registry yet.

The workflow uses `NPM_TOKEN` and runs in the **release** environment. Add the token under
Settings → Secrets and variables → Actions, and add protection rules to the environment
(required reviewers) if publishing needs an approval gate. The workflow runs on Node 24 with
npm 12.

## 7. Verify

```bash
npm view @kyneticweb/dom version
npm view @kyneticweb/ui version
npm view @kyneticweb/reactive dist-tags
```

Create a GitHub Release from the `vX.Y.Z` tag and paste `docs/releases/vX.Y.Z.md`. Attach
nothing unless a build artifact is part of the release.

## First framework release

The framework packages are at `0.1.0` and have never been published. The first release
publishes those versions as-is:

1. Release PR with `docs/releases/v0.2.0.md`.
2. Tag `v0.2.0`.
3. Release workflow with `publish: true`.
4. Verify every package and create the GitHub Release.

## Staged publishing

npm can place a version in its staging area instead of publishing it directly. `npm publish`
then fails with:

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

## Rollback

npm does not allow republishing a version. A broken release is handled by publishing a patched
version and deprecating the faulty one:

```bash
npm deprecate @kyneticweb/<package>@<version> "Broken release. Use <fixed-version>."
```

If the Release workflow failed after publishing some packages, fix forward with a new patch
release. Never delete or overwrite tags that npm has already published.

## Legacy cleanup

These steps were applied to the pre-framework packages and are kept for reference:

```bash
npm dist-tag add @kyneticweb/utils@0.1.0 beta
npm dist-tag add @kyneticweb/container@0.2.0 beta
npm dist-tag add @kyneticweb/counter@0.2.0 beta
npm dist-tag add @kyneticweb/versions@0.2.0 beta
npm dist-tag add @kyneticweb/parser@0.2.0 beta
npm dist-tag add @kyneticweb/console@0.2.0 beta
npm dist-tag add @kyneticweb/core@0.1.0 beta

npm deprecate @kyneticweb/console@0.1.6 "Broken build: main points to a missing file. Use 0.2.0."
npm deprecate @kyneticweb/container@0.1.5 "Broken build: main points to a missing file. Use 0.2.0."
npm deprecate @kyneticweb/counter@0.1.4 "Broken build: main points to a missing file. Use 0.2.0."
npm deprecate @kyneticweb/versions@0.1.4 "Broken build: main points to a missing file. Use 0.2.0."
npm deprecate @kyneticweb/libs@1.0.3 "Empty package. Install the specific libraries instead, e.g. @kyneticweb/core."
npm deprecate @kyneticweb/libs@1.0.1 "Empty package. Install the specific libraries instead, e.g. @kyneticweb/core."
```
