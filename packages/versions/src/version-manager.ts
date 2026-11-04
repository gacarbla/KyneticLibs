/**
 * High level facade for schema driven version validation, parsing, bumping and
 * comparison.
 */

import type { VersionRules, VersionValue } from "./version-rules.js";
import { DEFAULT_VERSION_RULES } from "./version-rules.js";
import { VersionSchema } from "./version-schema.js";

/** Tool identifier exposed to `@kyneticweb/core`. */
const TOOL_KIND = "versions";

/** Schema used when the caller does not provide one. */
const DEFAULT_VERSION_SCHEMA = "x.x.(x|w)(.(g|G|x))?";

/** Version used when the caller does not provide one. */
const DEFAULT_VERSION = "0.0.1";

/** A version split into its numeric prefix and its textual suffix. */
interface SplitVersion {
    readonly numeric: readonly string[];
    readonly suffix: readonly string[];
}

/** A numeric version that supports bumping. */
interface NumericVersion {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
    readonly suffix?: string;
}

/**
 * Schema driven version manager.
 *
 * The manager owns its schema and its immutable rule set. Every version it
 * holds has been validated against that schema.
 *
 * @example
 * ```ts
 * const manager = new VersionManager();
 * manager.setVersion("1.2.3.beta").bump("major").version; // "2.0.0"
 * manager.satisfies("1.2.3.beta"); // true
 * manager.compare("1.2.4"); // -1
 * ```
 */
export class VersionManager {
    /**
     * Identifier used by `@kyneticweb/core` to expose this tool.
     *
     * @example
     * ```ts
     * new VersionManager().toolKind; // "versions"
     * ```
     */
    public readonly toolKind = TOOL_KIND;

    private readonly schemaTemplate: string;
    private readonly versionRules: VersionRules;
    private readonly compiledSchema: VersionSchema;
    private currentVersion: string;

    /**
     * @param schema Version schema. Defaults to `"x.x.(x|w)(.(g|G|x))?"`.
     * @param version Initial version. Defaults to `"0.0.1"`.
     * @param rules Rule set used to compile the schema. Defaults to
     * {@link DEFAULT_VERSION_RULES}.
     * @throws {Error} When the initial version does not match the schema.
     * @example
     * ```ts
     * const manager = new VersionManager("x.x.G", "1.2.alpha");
     * ```
     */
    public constructor(
        schema: string = DEFAULT_VERSION_SCHEMA,
        version: string = DEFAULT_VERSION,
        rules: VersionRules = DEFAULT_VERSION_RULES,
    ) {
        this.schemaTemplate = schema;
        this.versionRules = rules;
        this.compiledSchema = new VersionSchema(schema, this.versionRules);
        this.currentVersion = version;
        this.assertMatchesSchema(version);
    }

    /**
     * The version currently held by the manager.
     *
     * @example
     * ```ts
     * new VersionManager().version; // "0.0.1"
     * ```
     */
    public get version(): string {
        return this.currentVersion;
    }

    /**
     * The schema template used to validate versions.
     *
     * @example
     * ```ts
     * new VersionManager("x.x.G").schema; // "x.x.G"
     * ```
     */
    public get schema(): string {
        return this.schemaTemplate;
    }

    /**
     * A deep-frozen snapshot of every rule used by the manager.
     *
     * @example
     * ```ts
     * new VersionManager().rules.G; // ["alpha", "beta", ...]
     * ```
     */
    public get rules(): Readonly<Record<string, readonly VersionValue[]>> {
        return this.versionRules.toObject();
    }

    /**
     * Replaces the current version after validating it.
     *
     * @param version New version.
     * @returns This manager, to allow chaining.
     * @throws {Error} When the version does not match the schema.
     * @example
     * ```ts
     * manager.setVersion("2.0.0").version; // "2.0.0"
     * ```
     */
    public setVersion(version: string): this {
        this.assertMatchesSchema(version);
        this.currentVersion = version;
        return this;
    }

    /**
     * Bumps one part of a numeric version.
     *
     * A numeric version is shaped like `major.minor.patch` with an optional
     * dot-suffixed segment, for example `"2.3.4.beta"`. Bumping `major`,
     * `minor` or `patch` drops the suffix. Bumping `prerelease` appends
     * `".beta"` only when no suffix is present.
     *
     * @param part Part to increment.
     * @returns This manager, to allow chaining.
     * @throws {Error} When the current version is not numeric-shaped, when
     * `prerelease` is requested for a version that already has a suffix, or
     * when the generated version does not match the manager schema.
     * @example
     * ```ts
     * new VersionManager(undefined, "2.3.4.beta").bump("major").version; // "3.0.0"
     * ```
     */
    public bump(part: "major" | "minor" | "patch" | "prerelease"): this {
        const parsed = parseNumericVersion(this.currentVersion);
        if (parsed === undefined) {
            throw new Error(
                `Cannot bump version "${this.currentVersion}": expected a numeric version shaped like ` +
                    '"major.minor.patch" with an optional dot-suffix.',
            );
        }

        switch (part) {
            case "major":
                return this.setVersion(`${parsed.major + 1}.0.0`);
            case "minor":
                return this.setVersion(`${parsed.major}.${parsed.minor + 1}.0`);
            case "patch":
                return this.setVersion(`${parsed.major}.${parsed.minor}.${parsed.patch + 1}`);
            case "prerelease":
                return this.bumpPrerelease(parsed);
            default:
                throw new Error(`Unsupported bump part "${part}".`);
        }
    }

    /**
     * Compares the current version with another version.
     *
     * Numeric segments are compared by value, then the remaining suffix is
     * compared lexicographically. A version without a suffix is considered
     * greater than its prereleases, so `"1.2.3"` compares greater than
     * `"1.2.3.beta"`. Versions with different numbers of segments are allowed;
     * missing numeric segments count as zero.
     *
     * @param other Version to compare against.
     * @returns `-1` when the current version is lower, `0` when both are equal
     * and `1` when the current version is higher.
     * @example
     * ```ts
     * new VersionManager(undefined, "1.2.3").compare("1.2.4"); // -1
     * ```
     */
    public compare(other: string): -1 | 0 | 1 {
        const current = splitVersion(this.currentVersion);
        const target = splitVersion(other);
        const numericResult = compareNumericParts(current.numeric, target.numeric);
        if (numericResult !== 0) {
            return normalizeComparison(numericResult);
        }
        return normalizeComparison(compareSuffixParts(current.suffix, target.suffix));
    }

    /**
     * Checks whether a version matches a schema.
     *
     * @param version Version to validate.
     * @param schema Schema to use. Defaults to the manager schema.
     * @returns `true` when the version matches.
     * @example
     * ```ts
     * new VersionManager().satisfies("1.2.3", "x.x.x"); // true
     * ```
     */
    public satisfies(version: string, schema?: string): boolean {
        if (schema === undefined) {
            return this.compiledSchema.test(version);
        }
        return new VersionSchema(schema, this.versionRules).test(version);
    }

    /**
     * Parses a version with the manager schema.
     *
     * @param version Version to parse. Defaults to the current version.
     * @returns The named groups of the first occurrence of each rule key, or
     * `undefined` when the version does not match.
     * @example
     * ```ts
     * new VersionManager().parse("1.2.3.beta"); // { x: "1", G: "beta" }
     * ```
     */
    public parse(version: string = this.currentVersion): Record<string, string> | undefined {
        return this.compiledSchema.parse(version);
    }

    /** Appends the default prerelease suffix to a version without a suffix. */
    private bumpPrerelease(parsed: NumericVersion): this {
        if (parsed.suffix !== undefined) {
            throw new Error(
                `Cannot bump the prerelease of version "${this.currentVersion}": it already has the suffix ` +
                    `"${parsed.suffix}", and prerelease bumping is not supported for this schema.`,
            );
        }
        return this.setVersion(`${this.currentVersion}.beta`);
    }

    /** Throws a readable error when a version does not match the schema. */
    private assertMatchesSchema(version: string): void {
        if (!this.compiledSchema.test(version)) {
            throw new Error(`Version "${version}" does not match the version schema "${this.schemaTemplate}".`);
        }
    }
}

/** Returns true when a segment is made of decimal digits only. */
function isNumericSegment(segment: string): boolean {
    return /^\d+$/.test(segment);
}

/** Splits a version into leading numeric segments and the remaining suffix. */
function splitVersion(version: string): SplitVersion {
    const segments = version.split(".");
    const suffixIndex = segments.findIndex((segment) => !isNumericSegment(segment));
    if (suffixIndex === -1) {
        return { numeric: segments, suffix: [] };
    }
    return { numeric: segments.slice(0, suffixIndex), suffix: segments.slice(suffixIndex) };
}

/** Parses the numeric shape required by {@link VersionManager.bump}. */
function parseNumericVersion(version: string): NumericVersion | undefined {
    const segments = version.split(".");
    if (segments.length < 3 || segments.length > 4) {
        return undefined;
    }

    const majorSegment = segments[0];
    const minorSegment = segments[1];
    const patchSegment = segments[2];
    const suffixSegment: string | undefined = segments.length === 4 ? segments[3] : undefined;

    if (!isNumericSegment(majorSegment) || !isNumericSegment(minorSegment) || !isNumericSegment(patchSegment)) {
        return undefined;
    }
    if (suffixSegment !== undefined && suffixSegment.length === 0) {
        return undefined;
    }

    return {
        major: Number(majorSegment),
        minor: Number(minorSegment),
        patch: Number(patchSegment),
        suffix: suffixSegment,
    };
}

/** Compares numeric segments position by position, treating missing segments as zero. */
function compareNumericParts(left: readonly string[], right: readonly string[]): number {
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
        const leftPart: string = left[index] ?? "0";
        const rightPart: string = right[index] ?? "0";
        const result = compareNumericText(leftPart, rightPart);
        if (result !== 0) {
            return result;
        }
    }
    return 0;
}

/** Compares two decimal strings by numeric value without losing precision. */
function compareNumericText(left: string, right: string): number {
    const leftDigits = stripLeadingZeros(left);
    const rightDigits = stripLeadingZeros(right);
    if (leftDigits.length !== rightDigits.length) {
        return leftDigits.length < rightDigits.length ? -1 : 1;
    }
    if (leftDigits === rightDigits) {
        return 0;
    }
    return leftDigits < rightDigits ? -1 : 1;
}

/** Removes leading zeros while keeping a single zero for zero values. */
function stripLeadingZeros(value: string): string {
    return value.replace(/^0+(?=\d)/, "");
}

/** Compares suffix segments lexicographically; a release outranks its prereleases. */
function compareSuffixParts(left: readonly string[], right: readonly string[]): number {
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
        const leftPart: string | undefined = left[index];
        const rightPart: string | undefined = right[index];
        if (leftPart === undefined && rightPart === undefined) {
            return 0;
        }
        // Same numeric prefix: "1.2.3" is greater than "1.2.3.beta".
        if (leftPart === undefined) {
            return 1;
        }
        if (rightPart === undefined) {
            return -1;
        }
        if (leftPart !== rightPart) {
            return leftPart < rightPart ? -1 : 1;
        }
    }
    return 0;
}

/** Narrows a comparison result to the documented `-1 | 0 | 1` range. */
function normalizeComparison(value: number): -1 | 0 | 1 {
    if (value < 0) {
        return -1;
    }
    if (value > 0) {
        return 1;
    }
    return 0;
}
