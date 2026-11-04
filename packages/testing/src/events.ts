/**
 * DOM events used by the testing helpers.
 *
 * Events are dispatched directly instead of calling `.click()`, so anchors do
 * not navigate and each test only runs the listeners it asked for.
 */

/** Resolves a selector against the container. */
export function resolveTarget(container: Element, target: Element | string): Element {
    if (typeof target !== "string") {
        return target;
    }
    const element = container.querySelector(target);
    if (element === null) {
        throw new Error(`No element matches selector "${target}".`);
    }
    return element;
}

/** Dispatches a click event. */
export function click(element: Element): boolean {
    return element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
}

/** Writes an input value and dispatches `input`. */
export function input(element: Element, value?: string): boolean {
    if (value !== undefined) {
        if (!("value" in element)) {
            throw new Error("input() expects an <input>, <textarea> or <select>.");
        }
        (element as HTMLInputElement).value = value;
    }
    return element.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Writes a value or checked state and dispatches `change`. */
export function change(element: Element, value?: string | boolean): boolean {
    if (value !== undefined) {
        if (typeof value === "boolean") {
            if (!(element instanceof HTMLInputElement)) {
                throw new Error("change(element, boolean) expects an <input>.");
            }
            element.checked = value;
        } else {
            if (!("value" in element)) {
                throw new Error("change() expects an element with a value.");
            }
            (element as HTMLInputElement).value = value;
        }
    }
    return element.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Dispatches `submit`. */
export function submit(element: Element): boolean {
    return element.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

/** Dispatches `keydown` for one key. */
export function keyDown(element: Element, key: string): boolean {
    return element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

/** Sets a checkbox or radio state and dispatches `change`. */
export function check(element: Element, checked = true): boolean {
    if (!(element instanceof HTMLInputElement)) {
        throw new Error("check() expects an <input>.");
    }
    element.checked = checked;
    return change(element);
}

/** Low-level event helpers. */
export const fireEvent = {
    click,
    input,
    change,
    submit,
    keyDown,
    check,
};
