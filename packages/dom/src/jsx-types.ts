import type { Child, ClassValue, StyleValue } from "./types.js";

/** Event handler types keyed by JSX prop name. */
interface DOMEventMap {
    onClick: MouseEvent;
    onDoubleClick: MouseEvent;
    onContextMenu: MouseEvent;
    onMouseDown: MouseEvent;
    onMouseUp: MouseEvent;
    onMouseMove: MouseEvent;
    onMouseEnter: MouseEvent;
    onMouseLeave: MouseEvent;
    onPointerDown: PointerEvent;
    onPointerUp: PointerEvent;
    onPointerMove: PointerEvent;
    onKeyDown: KeyboardEvent;
    onKeyUp: KeyboardEvent;
    onKeyPress: KeyboardEvent;
    onInput: InputEvent;
    onChange: Event;
    onSubmit: SubmitEvent;
    onReset: Event;
    onFocus: FocusEvent;
    onBlur: FocusEvent;
    onScroll: Event;
    onWheel: WheelEvent;
    onTouchStart: TouchEvent;
    onTouchEnd: TouchEvent;
    onTouchMove: TouchEvent;
    onDragStart: DragEvent;
    onDragOver: DragEvent;
    onDrop: DragEvent;
    onLoad: Event;
    onError: Event;
}

/** Typed event props. */
export type EventProps = {
    [Key in keyof DOMEventMap]?: (event: DOMEventMap[Key]) => void;
};

/** Props shared by every intrinsic element. */
export interface BaseProps {
    /** Class name, list or `{ name: enabled }` map. */
    class?: ClassValue;
    /** Alias of `class`. */
    className?: ClassValue;
    /** CSS text or property map. */
    style?: StyleValue;
    /** Element identifier. */
    id?: string;
    /** Tooltip text. */
    title?: string;
    /** ARIA role. */
    role?: string;
    /** Hides the element. */
    hidden?: boolean;
    /** Tab order. */
    tabIndex?: number;
    /** Element reference. */
    ref?: (element: Element | null) => void;
    /** List key (consumed by keyed collections). */
    key?: string | number;
    /** Children, when passed explicitly. */
    children?: Child;
    /** Raw HTML. Use with trusted content only. */
    innerHTML?: string;
    /** Text content. */
    textContent?: string;
    /** Form value. */
    value?: string | number;
    /** Checkbox or radio state. */
    checked?: boolean;
    /** Option selection. */
    selected?: boolean;
    /** Disabled state. */
    disabled?: boolean;
    /** Multiple selection. */
    multiple?: boolean;
    /** Read-only state. */
    readOnly?: boolean;
    /** Required state. */
    required?: boolean;
    /** Placeholder text. */
    placeholder?: string;
    /** Input type. */
    type?: string;
    /** Link target. */
    href?: string;
    /** Link target window. */
    target?: string;
    /** Link relation. */
    rel?: string;
    /** Image source. */
    src?: string;
    /** Alternative text. */
    alt?: string;
    /** Field name. */
    name?: string;
    /** Form owner. */
    htmlFor?: string;
    /** Autocomplete hint. */
    autoComplete?: string;
    /** Focus on mount. */
    autoFocus?: boolean;
    /** Rows for text areas. */
    rows?: number;
    /** Columns for text areas. */
    cols?: number;
    /** Minimum value. */
    min?: number | string;
    /** Maximum value. */
    max?: number | string;
    /** Step value. */
    step?: number | string;
    /** Accepted file types. */
    accept?: string;
    /** Form action. */
    action?: string;
    /** Form method. */
    method?: string;
    /** `data-*` attributes. */
    [key: `data-${string}`]: unknown;
    /** `aria-*` attributes. */
    [key: `aria-${string}`]: unknown;
    /** Any other attribute. */
    [key: string]: unknown;
}

/** Props accepted by an intrinsic element. */
export type ElementProps = BaseProps & EventProps;

/** Tag-to-props map used by the global `JSX` namespace. */
export type IntrinsicElementMap = {
    [Tag in keyof HTMLElementTagNameMap]: ElementProps;
};

declare global {
    namespace JSX {
        /** Type of a JSX expression. */
        type Element = Child;
        /** Intrinsic element props. */
        type IntrinsicElements = IntrinsicElementMap;
        /** Attributes accepted by every element. */
        interface IntrinsicAttributes {
            key?: string | number;
        }
        /** Declares which prop receives children. */
        interface ElementChildrenAttribute {
            children: unknown;
        }
    }
}
