/**
 * Compilation of version templates into anchored regular expressions.
 *
 * A template is a sequence of rule keys and literal text. Rule keys are
 * replaced by their values; everything else is treated literally, except the
 * structural characters `(`, `)`, `|` and `?`, which keep their regular
 * expression grouping and alternation meaning.
 */

import type { VersionRules, VersionValue } from "./version-rules.js";

/** Characters that keep a regular expression meaning inside a template. */
const STRUCTURAL_CHARACTERS: ReadonlySet<string> = new Set(["(", ")", "|", "?"]);

/** Shape every rule key must have when it becomes a named capture group. */
const RULE_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * A compiled version template.
 *
 * The template is compiled once in the constructor, so validating many
 * versions with the same schema is cheap. The receiver is immutable.
 *
 * @example
 * ```ts
 * const schema = new VersionSchema("x.x.(g|G)", DEFAULT_VERSION_RULES);
 * schema.test("1.2.beta"); // true
 * schema.parse("1.2.beta"); // { x: "1", G: "beta" }
 * ```
 */
export class VersionSchema {
    private readonly compiled: RegExp;
    private readonly templateValue: string;

    /**
     * @param template Version template, for example `"x.x.(g|G)"`.
     * @param rules Rules used to expand the template keys.
     * @throws {Error} When a rule key cannot be used as a named capture group.
     */
    public constructor(template: string, rules: VersionRules) {
        this.templateValue = template;
        this.compiled = compileTemplate(template, rules);
    }

    /**
     * The original, uncompiled template.
     *
     * @example
     * ```ts
     * new VersionSchema("x.x.x", DEFAULT_VERSION_RULES).template; // "x.x.x"
     * ```
     */
    public get template(): string {
        return this.templateValue;
    }

    /**
     * Tests whether a version matches the whole template.
     *
     * @param version Version to validate.
     * @returns `true` when the version matches every part of the template.
     * @example
     * ```ts
     * new VersionSchema("x.x.x", DEFAULT_VERSION_RULES).test("1.2.3"); // true
     * ```
     */
    public test(version: string): boolean {
        return this.compiled.test(version);
    }

    /**
     * Extracts the named groups of the first match.
     *
     * Only the first occurrence of a repeated rule key is captured; later
     * occurrences are compiled as non-capturing groups. Groups that did not
     * participate in the match are omitted from the result.
     *
     * @param version Version to parse.
     * @returns The captured groups, or `undefined` when the version does not match.
     * @example
     * ```ts
     * new VersionSchema("x.x.G", DEFAULT_VERSION_RULES).parse("1.2.beta");
     * // { x: "1", G: "beta" }
     * ```
     */
    public parse(version: string): Record<string, string> | undefined {
        const match = this.compiled.exec(version);
        if (match === null) {
            return undefined;
        }

        const groups: Record<string, string> = {};
        for (const [key, value] of Object.entries(match.groups ?? {})) {
            if (value !== undefined) {
                groups[key] = value;
            }
        }
        return groups;
    }
}

/** Compiles a template and its rules into a cached anchored regular expression. */
function compileTemplate(template: string, rules: VersionRules): RegExp {
    const keys = orderKeys(rules.keys());
    assertValidKeys(keys);

    const capturedKeys = new Set<string>();
    let source = "";
    let index = 0;

    while (index < template.length) {
        const key = keys.find((candidate) => template.startsWith(candidate, index));
        if (key === undefined) {
            source += renderTemplateCharacter(template.charAt(index));
            index += 1;
            continue;
        }
        source += renderRule(key, rules, capturedKeys);
        index += key.length;
    }

    return new RegExp(`^(?:${source})$`, "u");
}

/** Sorts keys so the longest one always wins, with a stable alphabetical tie-break. */
function orderKeys(keys: readonly string[]): string[] {
    return [...keys].sort((left, right) => right.length - left.length || left.localeCompare(right));
}

/** Rejects keys that cannot be used as regular expression named groups. */
function assertValidKeys(keys: readonly string[]): void {
    for (const key of keys) {
        if (!RULE_KEY_PATTERN.test(key)) {
            throw new Error(
                `Invalid version rule key "${key}": keys must start with a letter or underscore and contain only ` +
                    "letters, digits or underscores.",
            );
        }
    }
}

/** Renders one rule occurrence, capturing only its first appearance. */
function renderRule(key: string, rules: VersionRules, capturedKeys: Set<string>): string {
    const values = rules.get(key) ?? [];
    const body = values.map(renderValue).join("|");
    if (capturedKeys.has(key)) {
        return `(?:${body})`;
    }
    capturedKeys.add(key);
    return `(?<${key}>${body})`;
}

/** Renders a rule value: literals are escaped, explicit patterns are inserted raw. */
function renderValue(value: VersionValue): string {
    return typeof value === "string" ? escapeRegExp(value) : value.pattern;
}

/** Keeps structural template characters and escapes everything else. */
function renderTemplateCharacter(character: string): string {
    return STRUCTURAL_CHARACTERS.has(character) ? character : escapeRegExp(character);
}

/** Escapes every regular expression metacharacter in a literal value. */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
