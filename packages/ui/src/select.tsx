import { createSignal, Show, type Child } from "@kyneticweb/dom";
import { cx, read } from "./classes.js";
import { positionPanel, useDismiss, usePlacement } from "./popover.js";

/** One selectable option. */
export interface SelectOption {
    readonly value: string;
    readonly label: string;
    readonly description?: string;
    readonly disabled?: boolean;
}

/** A labelled group of options. */
export interface SelectGroup {
    readonly label: string;
    readonly options: readonly SelectOption[];
}

/** Option or group accepted by {@link Select}. */
export type SelectItem = SelectOption | SelectGroup;

/** Props accepted by {@link Select}. */
export interface SelectProps {
    /** Options and groups, in display order. */
    readonly items: readonly SelectItem[];
    /** Controlled value, or an accessor. Omit to let the component own it. */
    readonly value?: string | (() => string);
    /** Initial value when uncontrolled. */
    readonly defaultValue?: string;
    readonly onChange?: (value: string) => void;
    readonly placeholder?: string;
    /** Shows a search field that filters options. */
    readonly searchable?: boolean;
    /** Shows a clear button while a value is selected. */
    readonly clearable?: boolean;
    readonly disabled?: boolean | (() => boolean);
    readonly label?: string;
    /** Adds a hidden input for native form submission. */
    readonly name?: string;
    readonly class?: string;
}

/** Reports whether an item is a group. */
function isGroup(item: SelectItem): item is SelectGroup {
    return "options" in item;
}

/**
 * Accessible select with optional search and groups.
 *
 * The panel uses fixed positioning, so it is not clipped by cards or dialogs.
 * Keyboard: arrows move the highlight, Enter selects, Escape closes.
 *
 * @example
 * ```tsx
 * <Select
 *     searchable
 *     label="Country"
 *     items={[
 *         { label: "Europe", options: [{ value: "es", label: "Spain" }] },
 *         { label: "America", options: [{ value: "mx", label: "Mexico" }] },
 *     ]}
 *     onChange={(value) => console.log(value)}
 * />
 * ```
 */
export function Select(props: SelectProps): Child {
    const flat: SelectOption[] = [];
    for (const item of props.items) {
        if (isGroup(item)) {
            flat.push(...item.options);
        } else {
            flat.push(item);
        }
    }
    const byValue = new Map<string, SelectOption>();
    const indexOf = new Map<SelectOption, number>();
    flat.forEach((option, index) => {
        byValue.set(option.value, option);
        indexOf.set(option, index);
    });

    const internal = createSignal(props.defaultValue ?? "");
    const open = createSignal(false);
    const query = createSignal("");
    const highlighted = createSignal(-1);

    const disabled = (): boolean => read(props.disabled) === true;
    const current = (): string => (typeof props.value === "function" ? props.value() : (props.value ?? internal()));
    const selected = (): SelectOption | undefined => byValue.get(current());

    const matches = (option: SelectOption): boolean => {
        const text = query().trim().toLowerCase();
        if (text.length === 0) {
            return true;
        }
        return option.label.toLowerCase().includes(text) || (option.description?.toLowerCase().includes(text) ?? false);
    };

    const firstVisible = (start = 0): number => {
        for (let offset = 0; offset < flat.length; offset += 1) {
            const index = (start + offset) % flat.length;
            const option = flat[index];
            if (option !== undefined && option.disabled !== true && matches(option)) {
                return index;
            }
        }
        return -1;
    };

    const lastVisible = (): number => {
        for (let index = flat.length - 1; index >= 0; index -= 1) {
            const option = flat[index];
            if (option !== undefined && option.disabled !== true && matches(option)) {
                return index;
            }
        }
        return -1;
    };

    let trigger: HTMLButtonElement | null = null;
    let panel: HTMLElement | null = null;
    let list: HTMLElement | null = null;
    let search: HTMLInputElement | null = null;

    const close = (focusTrigger = false): void => {
        open.set(false);
        if (focusTrigger) {
            queueMicrotask(() => trigger?.focus());
        }
    };

    const openPanel = (): void => {
        if (disabled()) {
            return;
        }
        query.set("");
        const option = selected();
        highlighted.set(option === undefined ? firstVisible() : (indexOf.get(option) ?? firstVisible()));
        open.set(true);
        queueMicrotask(() => {
            if (props.searchable === true) {
                search?.focus();
            } else {
                list?.focus();
            }
        });
    };

    const select = (option: SelectOption): void => {
        if (option.disabled === true) {
            return;
        }
        if (props.value === undefined) {
            internal.set(option.value);
        }
        props.onChange?.(option.value);
        close(true);
    };

    const move = (delta: number): void => {
        if (flat.length === 0) {
            return;
        }
        let index = highlighted();
        for (let step = 0; step < flat.length; step += 1) {
            index = (index + delta + flat.length) % flat.length;
            const option = flat[index];
            if (option !== undefined && option.disabled !== true && matches(option)) {
                highlighted.set(index);
                return;
            }
        }
    };

    const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
        } else if (event.key === "Home") {
            event.preventDefault();
            highlighted.set(firstVisible());
        } else if (event.key === "End") {
            event.preventDefault();
            highlighted.set(lastVisible());
        } else if (event.key === "Enter") {
            event.preventDefault();
            const option = flat[highlighted()];
            if (option !== undefined && matches(option)) {
                select(option);
            }
        } else if (event.key === "Escape") {
            event.preventDefault();
            close(true);
        }
    };

    useDismiss({ isOpen: open, close: () => close(false), panel: () => panel, trigger: () => trigger });
    usePlacement(
        open,
        () => panel,
        () => trigger,
    );

    const renderOption = (option: SelectOption): Child => {
        const index = indexOf.get(option) ?? -1;
        return (
            <button
                type="button"
                role="option"
                class={(): string =>
                    cx(
                        "kyn-select__option",
                        current() === option.value && "is-selected",
                        highlighted() === index && matches(option) && "is-highlighted",
                    )
                }
                aria-selected={(): string => (current() === option.value ? "true" : "false")}
                disabled={option.disabled === true}
                hidden={(): boolean => !matches(option)}
                onClick={() => select(option)}
                onMouseEnter={() => {
                    if (option.disabled !== true) {
                        highlighted.set(index);
                    }
                }}
            >
                <span class="kyn-select__option-label">{option.label}</span>
                {option.description !== undefined ? (
                    <span class="kyn-select__option-description">{option.description}</span>
                ) : null}
                <span class="kyn-select__check" aria-hidden="true" hidden={(): boolean => current() !== option.value}>
                    ✓
                </span>
            </button>
        );
    };

    return (
        <div class={cx("kyn-select", props.class)}>
            {props.label !== undefined ? <span class="kyn-field__label">{props.label}</span> : null}
            <div class="kyn-select__anchor">
                <button
                    ref={(element) => {
                        trigger = element as HTMLButtonElement | null;
                    }}
                    type="button"
                    class="kyn-select__trigger"
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={(): string => (open() ? "true" : "false")}
                    aria-label={props.label ?? props.placeholder ?? "Select an option"}
                    onClick={() => (open() ? close() : openPanel())}
                    onKeyDown={(event: KeyboardEvent) => {
                        if (event.key === "ArrowDown" && !open()) {
                            event.preventDefault();
                            openPanel();
                        }
                    }}
                >
                    <span class={(): string => cx("kyn-select__value", selected() === undefined && "is-placeholder")}>
                        {(): Child => selected()?.label ?? props.placeholder ?? "Select…"}
                    </span>
                    <span class="kyn-select__chevron" aria-hidden="true">
                        ▾
                    </span>
                </button>
                <Show when={() => props.clearable === true && current() !== ""}>
                    <button
                        type="button"
                        class="kyn-select__clear"
                        aria-label="Clear selection"
                        onClick={() => {
                            if (props.value === undefined) {
                                internal.set("");
                            }
                            props.onChange?.("");
                        }}
                    >
                        ×
                    </button>
                </Show>
            </div>
            {props.name !== undefined ? <input type="hidden" name={props.name} value={() => current()} /> : null}
            <Show when={open}>
                <div
                    class="kyn-select__panel"
                    ref={(element) => {
                        panel = element as HTMLElement | null;
                        if (panel !== null && trigger !== null) {
                            positionPanel(panel, trigger);
                        }
                    }}
                    onKeyDown={onKeyDown}
                >
                    {props.searchable === true ? (
                        <input
                            ref={(element) => {
                                search = element as HTMLInputElement | null;
                            }}
                            class="kyn-select__search"
                            type="search"
                            placeholder="Search…"
                            value={() => query()}
                            onInput={(event: InputEvent) => {
                                query.set((event.target as HTMLInputElement).value);
                                highlighted.set(firstVisible());
                            }}
                        />
                    ) : null}
                    <div
                        class="kyn-select__list"
                        role="listbox"
                        tabIndex={props.searchable === true ? -1 : 0}
                        ref={(element) => {
                            list = element as HTMLElement | null;
                        }}
                        aria-label={props.label ?? "Options"}
                    >
                        {props.items.map((item) =>
                            isGroup(item) ? (
                                <div class="kyn-select__group">
                                    <div
                                        class="kyn-select__group-label"
                                        hidden={(): boolean => !item.options.some((option) => matches(option))}
                                    >
                                        {item.label}
                                    </div>
                                    {item.options.map((option) => renderOption(option))}
                                </div>
                            ) : (
                                renderOption(item)
                            ),
                        )}
                    </div>
                </div>
            </Show>
        </div>
    );
}
