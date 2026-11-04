/**
 * Public types of the DOM runtime.
 */

/** Values that can appear as a child of an element or component. */
export type Child = Node | Primitive | (() => Child) | Child[];

/** Primitive values accepted as children. */
export type Primitive = string | number | boolean | null | undefined;

/** `class` value: string, list or `{ name: enabled }` map. */
export type ClassValue = string | false | null | undefined | ClassValue[] | Record<string, boolean | undefined>;

/** `style` value: CSS text or a property map. */
export type StyleValue = string | Record<string, string | number | undefined>;

/** Loose prop bag used by the JSX factory. */
export type Props = Record<string, unknown>;

/**
 * Function component.
 *
 * The body runs once. Reactivity comes from the signals read inside JSX
 * expressions, not from re-running the component.
 */
export type Component<P extends object = Record<string, never>> = (props: P & { children?: Child }) => Child;
