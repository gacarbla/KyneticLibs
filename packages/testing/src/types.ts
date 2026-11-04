import type { Child } from "@kyneticweb/dom";

/** Text matcher: exact string or regular expression. */
export type TextMatcher = string | RegExp;

/** Element or selector accepted by actions. */
export type Target = Element | string;

/** Options accepted by {@link render}. */
export interface RenderOptions {
    /** Existing element that receives the tree. A fresh div is used by default. */
    readonly container?: Element;
}

/** Options accepted by {@link waitFor}. */
export interface WaitForOptions {
    /** Maximum time to wait in milliseconds. Defaults to 1000. */
    readonly timeout?: number;
    /** Delay between checks in milliseconds. Defaults to 10. */
    readonly interval?: number;
}

/** Mounted application returned by {@link render}. */
export interface TestApp {
    /** Element that contains the tree. */
    readonly container: HTMLElement;
    /** Unmounts the tree and removes the container when it was created here. */
    dispose(): void;
    /** Current markup. */
    html(): string;
    /** Trimmed text content. */
    text(): string;
    /** First element matching a selector. */
    find(selector: string): Element | null;
    /** Every element matching a selector. */
    findAll(selector: string): Element[];
    /** The deepest element whose text matches. Throws when there is none. */
    getByText(matcher: TextMatcher): Element;
    /** The deepest element whose text matches, or `null`. */
    queryByText(matcher: TextMatcher): Element | null;
    /** Every element whose text matches, including ancestors. */
    queryAllByText(matcher: TextMatcher): Element[];
    /** Dispatches a click. */
    click(target: Target): void;
    /** Writes a value and dispatches `input`. */
    input(target: Target, value: string): void;
    /** Writes a value (or checked state) and dispatches `change`. */
    change(target: Target, value?: string | boolean): void;
    /** Dispatches `submit`. Call `flush()` afterwards to see the result. */
    submit(target: Target): void;
    /** Dispatches `keydown`. */
    keyDown(target: Target, key: string): void;
    /** Sets a checkbox or radio state and dispatches `change`. */
    check(target: Target, checked?: boolean): void;
    /** Waits for the reactive scheduler to commit pending effects. */
    flush(): Promise<void>;
}

/** Root component accepted by {@link render}. */
export type TestComponent = () => Child;
