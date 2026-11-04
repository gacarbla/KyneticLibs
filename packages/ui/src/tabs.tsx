import { createSignal, type Child } from "@kyneticweb/dom";
import { cx, sizeToken, type SizeInput } from "./classes.js";

/** One tab and its panel. */
export interface TabItem {
    /** Stable id, unique on the page. Also used for the ARIA ids. */
    readonly id: string;
    readonly label: Child;
    readonly content: Child;
    readonly disabled?: boolean;
}

/** Props accepted by {@link Tabs}. */
export interface TabsProps {
    readonly items: readonly TabItem[];
    /** Active id, or an accessor. Omit to let the component own the state. */
    readonly value?: string | (() => string);
    readonly onChange?: (id: string) => void;
    /** Visual style of the tab list. */
    readonly variant?: "line" | "pills" | "segmented";
    readonly size?: SizeInput;
    readonly class?: string;
}

/**
 * Tab list with arrow-key navigation and ARIA wiring.
 *
 * Items are read once per mount; change them through a keyed parent when the
 * collection itself is dynamic.
 *
 * @example
 * ```tsx
 * <Tabs
 *     items={[
 *         { id: "overview", label: "Overview", content: <Overview /> },
 *         { id: "billing", label: "Billing", content: <Billing /> },
 *     ]}
 * />
 * ```
 */
export function Tabs(props: TabsProps): Child {
    const internal = createSignal(props.items[0]?.id ?? "");
    const active = (): string => (typeof props.value === "function" ? props.value() : (props.value ?? internal()));
    let list: HTMLElement | null = null;

    const select = (id: string): void => {
        if (props.value === undefined) {
            internal.set(id);
        }
        props.onChange?.(id);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
            return;
        }
        const enabled = props.items.filter((item) => item.disabled !== true);
        if (enabled.length === 0) {
            return;
        }
        const current = enabled.findIndex((item) => item.id === active());
        const offset = event.key === "ArrowRight" ? 1 : -1;
        const next = enabled[(current + offset + enabled.length) % enabled.length];
        if (next === undefined) {
            return;
        }
        event.preventDefault();
        select(next.id);
        list?.querySelector<HTMLElement>(`[data-tab="${next.id}"]`)?.focus();
    };

    return (
        <div class={cx("kyn-tabs", `kyn-tabs--${sizeToken(props.size)}`, props.class)}>
            <div
                class={cx("kyn-tabs__list", `kyn-tabs__list--${props.variant ?? "line"}`)}
                role="tablist"
                ref={(element) => {
                    list = element as HTMLElement | null;
                }}
                onKeyDown={onKeyDown}
            >
                {props.items.map((item) => (
                    <button
                        type="button"
                        role="tab"
                        data-tab={item.id}
                        id={`kyn-tab-${item.id}`}
                        aria-controls={`kyn-panel-${item.id}`}
                        aria-selected={(): string => (active() === item.id ? "true" : "false")}
                        tabIndex={(): number => (active() === item.id ? 0 : -1)}
                        class={(): string => cx("kyn-tabs__tab", active() === item.id && "is-active")}
                        disabled={item.disabled === true}
                        onClick={() => select(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            <div
                class="kyn-tabs__panel"
                role="tabpanel"
                id={(): string => `kyn-panel-${active()}`}
                aria-labelledby={(): string => `kyn-tab-${active()}`}
            >
                {(): Child => props.items.find((item) => item.id === active())?.content ?? null}
            </div>
        </div>
    );
}
