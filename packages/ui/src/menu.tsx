import { createSignal, Show, type Child } from "@kyneticweb/dom";
import { cx, read } from "./classes.js";
import type { ButtonSize, ButtonVariant } from "./button.js";
import { positionPanel, useDismiss, usePlacement } from "./popover.js";

/** One entry of a {@link Menu}. */
export interface MenuItem {
    readonly id: string;
    readonly label: Child;
    readonly icon?: Child;
    /** Right-aligned hint, such as a shortcut. */
    readonly shortcut?: string;
    readonly disabled?: boolean;
    readonly danger?: boolean;
    /** Draws a separator above this item. */
    readonly separatorBefore?: boolean;
    readonly onSelect?: () => void;
}

/** Props accepted by {@link Menu}. */
export interface MenuProps {
    /** Trigger label. */
    readonly label: Child;
    readonly items: readonly MenuItem[];
    readonly align?: "start" | "end";
    readonly variant?: ButtonVariant;
    readonly size?: ButtonSize;
    readonly disabled?: boolean | (() => boolean);
    readonly class?: string;
}

/**
 * Dropdown menu with keyboard navigation.
 *
 * The panel is fixed-positioned and closes on Escape, on an outside click or
 * after an item is selected.
 *
 * @example
 * ```tsx
 * <Menu
 *     label="Actions"
 *     items={[
 *         { id: "edit", label: "Edit", onSelect: edit },
 *         { id: "delete", label: "Delete", danger: true, separatorBefore: true, onSelect: remove },
 *     ]}
 * />
 * ```
 */
export function Menu(props: MenuProps): Child {
    const open = createSignal(false);
    let trigger: HTMLButtonElement | null = null;
    let panel: HTMLElement | null = null;

    const close = (focusTrigger = false): void => {
        open.set(false);
        if (focusTrigger) {
            queueMicrotask(() => trigger?.focus());
        }
    };

    const openMenu = (): void => {
        if (read(props.disabled) === true) {
            return;
        }
        open.set(true);
        queueMicrotask(() => {
            panel?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
        });
    };

    const choose = (item: MenuItem): void => {
        if (item.disabled === true) {
            return;
        }
        item.onSelect?.();
        close(true);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
        const entries =
            panel === null ? [] : [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')];
        if (entries.length === 0) {
            return;
        }
        const index = entries.indexOf(document.activeElement as HTMLElement);

        if (event.key === "ArrowDown") {
            event.preventDefault();
            entries[(index + 1) % entries.length]?.focus();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            entries[(index - 1 + entries.length) % entries.length]?.focus();
        } else if (event.key === "Home") {
            event.preventDefault();
            entries[0]?.focus();
        } else if (event.key === "End") {
            event.preventDefault();
            entries[entries.length - 1]?.focus();
        } else if (event.key === "Escape") {
            event.preventDefault();
            close(true);
        } else if (event.key === "Tab") {
            close(false);
        }
    };

    useDismiss({ isOpen: open, close: () => close(false), panel: () => panel, trigger: () => trigger });
    usePlacement(
        open,
        () => panel,
        () => trigger,
        props.align ?? "start",
    );

    return (
        <span class={cx("kyn-menu", props.class)}>
            <button
                ref={(element) => {
                    trigger = element as HTMLButtonElement | null;
                }}
                type="button"
                class={cx(
                    "kyn-btn",
                    `kyn-btn--${props.variant ?? "secondary"}`,
                    `kyn-btn--${props.size ?? "md"}`,
                    "kyn-menu__trigger",
                )}
                aria-haspopup="menu"
                aria-expanded={(): string => (open() ? "true" : "false")}
                disabled={() => read(props.disabled) === true}
                onClick={() => (open() ? close() : openMenu())}
                onKeyDown={(event: KeyboardEvent) => {
                    if (event.key === "ArrowDown" && !open()) {
                        event.preventDefault();
                        openMenu();
                    }
                }}
            >
                {props.label}
                <span class="kyn-menu__chevron" aria-hidden="true">
                    ▾
                </span>
            </button>
            <Show when={open}>
                <div
                    class="kyn-menu__panel"
                    role="menu"
                    ref={(element) => {
                        panel = element as HTMLElement | null;
                        if (panel !== null && trigger !== null) {
                            positionPanel(panel, trigger, props.align ?? "start");
                        }
                    }}
                    onKeyDown={onKeyDown}
                >
                    {props.items.map((item) => (
                        <>
                            {item.separatorBefore === true ? (
                                <div class="kyn-menu__separator" role="separator" />
                            ) : null}
                            <button
                                type="button"
                                role="menuitem"
                                class={cx("kyn-menu__item", item.danger === true && "is-danger")}
                                disabled={item.disabled === true}
                                onClick={() => choose(item)}
                            >
                                {item.icon !== undefined ? (
                                    <span class="kyn-menu__icon" aria-hidden="true">
                                        {item.icon}
                                    </span>
                                ) : null}
                                <span class="kyn-menu__label">{item.label}</span>
                                {item.shortcut !== undefined ? (
                                    <span class="kyn-menu__shortcut">{item.shortcut}</span>
                                ) : null}
                            </button>
                        </>
                    ))}
                </div>
            </Show>
        </span>
    );
}
