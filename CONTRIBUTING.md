# Contributing

The repository follows a **trunk-based** workflow: `main` is always releasable, every change
lands through a pull request, and branches are short-lived.

## Branches

| Prefix | Use |
| --- | --- |
| `feat/<slug>` | New behaviour or a new package. |
| `fix/<slug>` | Bug fix. |
| `perf/<slug>` | Performance work without API changes. |
| `refactor/<slug>` | Internal change with no behaviour change. |
| `docs/<slug>` | Documentation only. |
| `test/<slug>` | Tests only. |
| `chore/<slug>` | Tooling, dependencies, CI. |
| `release/<version>` | Version and changelog preparation. |
| `hotfix/<slug>` | Urgent patch from `main`, released as a patch. |

Create branches from the latest `main`:

```bash
git switch main
git pull --ff-only
git switch -c feat/my-feature
```

Keep the branch focused on one logical change. Rebase on `main` while it is open; do not merge
`main` into the branch unless a conflict makes rebasing impractical.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <imperative summary>

<why the change is needed>

<breaking change note, or "Refs #123">
```

Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `release`.
Scopes are package names without the prefix (`dom`, `reactive`, `router`, `ssr`, `ui`, `repo`,
`ci`).

Rules:

- The subject is imperative, lowercase and at most 72 characters.
- The body explains **why**, not a list of files.
- One commit is one coherent step; split unrelated changes.
- Never commit generated output, `dist/`, `*.tsbuildinfo`, secrets or `.env` files.
- Reference issues with `Refs #123` or `Closes #123`.

Examples:

```
feat(ui): add searchable selects with grouped options
fix(dom): advance the dynamic slot range on updates
chore(ci): reject tracked build artifacts
release: prepare 0.1.0
```

## Pull requests

Every change goes through a pull request, including documentation and release prep.

1. Push the branch and open a PR against `main`.
2. Fill in the template: summary, changes, tests, screenshots for UI changes.
3. Wait for the **CI** workflow to pass on Node 20, 22 and 24.
4. Squash-merge the PR. The branch is deleted automatically.
5. The squash commit keeps the PR title as its subject, so the title must follow the commit
   convention.

A PR should be reviewable in one sitting. Split large features into stacked PRs when possible.

## Versioning

Packages are versioned with [Changesets](https://github.com/changesets/changesets). The
framework packages (`reactive`, `dom`, `router`, `i18n`, `forms`, `ssr`, `compiler`,
`testing`, `devtools`, `ui`) are released together; the utility packages follow their own
versions.

Add a changeset to every PR that changes a published package:

```bash
npx changeset
```

- `patch`: backwards-compatible fixes.
- `minor`: backwards-compatible features.
- `major`: breaking changes. Before 1.0, a breaking change may be released as `minor`, but it
  must be called out in the changeset summary.

A changeset is not needed for tests, internal tooling, documentation or the private examples.
The release PR applies the bumps and writes the changelogs with `npm run version`.

## Releases

Releases are prepared on a `release/<version>` branch:

1. Merge every feature/fix PR into `main`.
2. Create `release/x.y.z` from `main`.
3. Run `npx changeset version` (or `npm run version`) and review the changelogs.
4. Add or update `docs/releases/vX.Y.Z.md`.
5. Commit with `release: prepare x.y.z`, open a PR and merge once CI is green.
6. Tag the merge commit and run the **Release** workflow (see `RELEASING.md`).

Tags use the umbrella format `vX.Y.Z`; Changesets also creates per-package tags when it
publishes.

## Hotfixes

For a production bug:

1. Branch `hotfix/<slug>` from `main`.
2. Fix, add a `patch` changeset and tests.
3. Open the PR, merge after CI.
4. Release immediately with a patch version.

## Local checks

Run the same commands CI runs before pushing:

```bash
npm ci
npm run build -- --force
npm run typecheck
npm test
npm run lint
npm run format:check
npm run smoke
```

## Protected `main`

`main` is protected:

- Pull request required; direct pushes are blocked.
- The CI checks `Node 20`, `Node 22` and `Node 24` must pass.
- Branches must be up to date before merging.
- Linear history, no force pushes and no branch deletion.

Releases are the only exception: the release workflow publishes from a tag created on a
merged `main` commit.

## Code of conduct

Be direct and constructive. Review the code, not the author. Keep discussions in the PR so the
reasoning stays with the change.
