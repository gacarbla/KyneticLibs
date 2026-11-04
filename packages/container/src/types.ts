/**
 * Shape accepted by {@link StrictContainer}.
 *
 * Any object type is allowed, including `interface` declarations, which cannot
 * be assigned to `Record<string, unknown>` because they may be augmented. The
 * containers only read string keys (`keyof K & string`), so `object` is both
 * the most permissive and the most accurate constraint.
 *
 * @example
 * ```ts
 * interface Settings {
 *     theme: string;
 * }
 *
 * type AlsoValid = { theme: string };
 * ```
 */
export type KeyMap = object;

/**
 * Shape accepted by {@link DynamicContainer}.
 *
 * Same reasoning as {@link KeyMap}: interfaces must be usable without an index
 * signature.
 *
 * @example
 * ```ts
 * const container = new DynamicContainer<{ count: number }>();
 * ```
 */
export type DynamicKeyTypes = object;
