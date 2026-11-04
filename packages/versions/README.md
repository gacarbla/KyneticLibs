# `@kyneticweb/versions`

Schema driven version validation, parsing, bumping and comparison.

## Installation

```bash
npm install @kyneticweb/versions
```

## Usage

```ts
import { VersionManager } from "@kyneticweb/versions";

const manager = new VersionManager();

manager.version;                  // "0.0.1"
manager.setVersion("1.2.3.beta");
manager.parse();                  // { x: "1", G: "beta" }

manager.bump("minor").version;    // "1.3.0"
manager.compare("1.3.1");         // -1
manager.satisfies("2.0.0");       // true
```

## Schemas

A schema is a template made of rule keys and literal text. The default schema is
`x.x.(x|w)(.(g|G|x))?`, which accepts versions such as `1.2.3`, `1.2.3.beta` and `1.2.3.4`.

| Key | Meaning | Values |
| --- | --- | --- |
| `x` | Numeric segment | `\d+` |
| `g` | Greek letter | `α` … `ω` |
| `s` | Symbol | `!` … `+` |
| `G` | Greek letter name | `alpha` … `omega` |
| `w` | Word segment | `[A-Za-z0-9_]+` |

The structural characters `(`, `)`, `|` and `?` keep their regular expression meaning. Everything
else in the template is escaped, so a template can never inject a regular expression by accident.

```ts
import { VersionManager, VersionRules, pattern } from "@kyneticweb/versions";

const rules = new VersionRules({
    x: [pattern("\\d+")],
    stage: ["alpha", "beta", "stable"],
});

const manager = new VersionManager("x.x.stage", "1.0.alpha", rules);
manager.satisfies("2.5.beta"); // true
```

Rules are immutable: `add()` returns a new rule set, and the snapshots returned by `rules` are
deep-frozen. Mutating them at runtime cannot break validation that has already been compiled.

## API

### `VersionManager`

- `new VersionManager(schema?, version?, rules?)`
- `version`, `schema`, `rules`
- `setVersion(version)` — validates and returns `this`
- `bump("major" | "minor" | "patch" | "prerelease")` — numeric versions only; `prerelease` appends
  `.beta` when there is no suffix
- `compare(other)` — `-1 | 0 | 1`; a release outranks its prereleases (`1.2.3 > 1.2.3.beta`)
- `satisfies(version, schema?)`
- `parse(version?)` — named groups of the first occurrence of each rule key

### `VersionSchema`

- `new VersionSchema(template, rules)`
- `test(version)` — anchored match against the whole template
- `parse(version)` — captured groups, or `undefined`

### `VersionRules`

- `new VersionRules(initial?)`
- `add(key, values)` — returns a new frozen instance
- `get(key)`, `keys()`, `toObject()`
- `pattern(fragment)` — marks a value as an explicit regular expression fragment

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
