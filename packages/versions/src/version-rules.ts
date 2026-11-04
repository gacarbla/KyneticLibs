/**
 * Immutable rule sets used by `VersionSchema` to compile version templates.
 *
 * A rule maps a single-letter (or longer) key to the values that key accepts.
 * A value is either literal text, which is escaped before it reaches the
 * regular expression, or an explicit {@link VersionValuePattern} fragment that
 * is inserted as-is.
 */

/** A regular expression fragment that is inserted into a compiled schema verbatim. */
export interface VersionValuePattern {
    readonly pattern: string;
}

/** A value accepted by a version rule: literal text or an explicit pattern. */
export type VersionValue = string | VersionValuePattern;

/**
 * Creates a pattern value from a regular expression fragment.
 *
 * Use this helper instead of a plain string when the value must be interpreted
 * as a regular expression rather than as literal text.
 *
 * @param fragment Regular expression fragment, for example `"\\d+"`.
 * @returns A frozen pattern value.
 * @example
 * ```ts
 * const digits = pattern("\\d+");
 * // { pattern: "\\d+" }
 * ```
 */
export function pattern(fragment: string): VersionValuePattern {
    return Object.freeze({ pattern: fragment });
}

/** Returns true when a rule value is an explicit pattern rather than literal text. */
function isVersionValuePattern(value: VersionValue): value is VersionValuePattern {
    return typeof value !== "string";
}

/** Copies a rule value into a frozen representation owned by the rule set. */
function copyValue(value: VersionValue): VersionValue {
    return isVersionValuePattern(value) ? Object.freeze({ pattern: value.pattern }) : value;
}

/** Copies and deep-freezes every rule and every rule value. */
function freezeRules(
    rules: Readonly<Record<string, readonly VersionValue[]>>,
): Readonly<Record<string, readonly VersionValue[]>> {
    const entries: Array<[string, readonly VersionValue[]]> = Object.entries(rules).map(([key, values]) => [
        key,
        Object.freeze(values.map(copyValue)),
    ]);
    return Object.freeze(Object.fromEntries(entries));
}

/**
 * An immutable collection of version rules.
 *
 * Every instance is deep-frozen, so handing it to a consumer can never break
 * an already compiled schema. Methods that change the rules return a new
 * instance instead of mutating the receiver.
 *
 * @example
 * ```ts
 * const rules = new VersionRules({ x: [pattern("\\d+")] });
 * const extended = rules.add("g", ["alpha", "beta"]);
 * rules.get("g"); // undefined
 * extended.get("g"); // ["alpha", "beta"]
 * ```
 */
export class VersionRules {
    private readonly values: Readonly<Record<string, readonly VersionValue[]>>;

    /**
     * @param initialRules Rules to copy. The input object is never retained, so
     * later changes to it cannot affect this instance.
     * @example
     * ```ts
     * const rules = new VersionRules({ x: [pattern("\\d+")], G: ["alpha"] });
     * ```
     */
    public constructor(initialRules: Readonly<Record<string, readonly VersionValue[]>> = {}) {
        this.values = freezeRules(initialRules);
    }

    /**
     * Returns a new frozen rule set containing all rules of the receiver plus `key`.
     *
     * The receiver is never mutated. When `key` already exists, its values are
     * replaced in the returned instance.
     *
     * @param key Rule key. It is later used as a regular expression named group.
     * @param values Values accepted by the rule.
     * @returns A new frozen rule set, or an equivalent one when nothing changed.
     * @example
     * ```ts
     * const extended = rules.add("w", [pattern("[A-Za-z0-9_]+")]);
     * extended.get("w");
     * ```
     */
    public add(key: string, values: readonly VersionValue[]): VersionRules {
        const entries: Array<[string, readonly VersionValue[]]> = [...Object.entries(this.values), [key, values]];
        return new VersionRules(Object.fromEntries(entries));
    }

    /**
     * Reads a rule by key.
     *
     * @param key Rule key.
     * @returns The frozen values of the rule, or `undefined` when the key is unknown.
     * @example
     * ```ts
     * rules.get("x"); // [{ pattern: "\\d+" }]
     * ```
     */
    public get(key: string): readonly VersionValue[] | undefined {
        return Object.hasOwn(this.values, key) ? this.values[key] : undefined;
    }

    /**
     * Lists every rule key in alphabetical order.
     *
     * @returns A new array with the sorted keys.
     * @example
     * ```ts
     * rules.keys(); // ["G", "g", "s", "w", "x"]
     * ```
     */
    public keys(): string[] {
        return Object.keys(this.values).sort();
    }

    /**
     * Returns the deep-frozen snapshot of every rule.
     *
     * The snapshot is safe to hand to consumers: neither the outer object nor
     * its value arrays can be modified.
     *
     * @returns A deep-frozen record of rule values.
     * @example
     * ```ts
     * Object.isFrozen(rules.toObject()); // true
     * ```
     */
    public toObject(): Readonly<Record<string, readonly VersionValue[]>> {
        return this.values;
    }
}

/**
 * Rule set used when no custom rules are supplied.
 *
 * Keys:
 *
 * | Key | Meaning                 | Values                  |
 * | --- | ----------------------- | ----------------------- |
 * | `x` | Numeric segment         | `\d+`                   |
 * | `g` | Greek letter            | `α` … `ω`               |
 * | `s` | Symbol                  | `!` … `+`               |
 * | `G` | Greek letter name       | `alpha` … `omega`       |
 * | `w` | Word segment            | `[A-Za-z0-9_]+`         |
 *
 * @example
 * ```ts
 * const schema = new VersionSchema("x.x.(g|G)", DEFAULT_VERSION_RULES);
 * ```
 */
export const DEFAULT_VERSION_RULES: VersionRules = new VersionRules({
    x: [pattern("\\d+")],
    g: [
        "α",
        "β",
        "γ",
        "δ",
        "ε",
        "ζ",
        "η",
        "θ",
        "ι",
        "κ",
        "λ",
        "μ",
        "ν",
        "ξ",
        "ο",
        "π",
        "ρ",
        "σ",
        "τ",
        "υ",
        "φ",
        "χ",
        "ψ",
        "ω",
    ],
    s: ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "=", "+"],
    G: [
        "alpha",
        "beta",
        "gamma",
        "delta",
        "epsilon",
        "zeta",
        "eta",
        "theta",
        "iota",
        "kappa",
        "lambda",
        "mu",
        "nu",
        "xi",
        "omicron",
        "pi",
        "rho",
        "sigma",
        "tau",
        "upsilon",
        "phi",
        "chi",
        "psi",
        "omega",
    ],
    w: [pattern("[A-Za-z0-9_]+")],
});
