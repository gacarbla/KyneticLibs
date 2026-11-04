import { createEffect, onCleanup, Show, type Child } from "@kyneticweb/dom";
import { cx, read } from "./classes.js";

/** Props accepted by {@link Dialog}. */
export interface DialogProps {
    /** Open state, or an accessor for reactive state. */
    readonly open: boolean | (() => boolean);
    /** Called when the user presses Escape, clicks the backdrop or closes it. */
    readonly onClose?: () => void;
    /** Accessible name and visible heading. */
    readonly title: string;
    readonly children?: Child;
    readonly footer?: Child;
    readonly class?: string;
}

/**
 * Modal dialog rendered in place with a fixed backdrop.
 *
 * It closes on Escape and restores focus to the element that opened it. Focus
 * is moved into the dialog, but there is no full focus trap yet.
 *
 * @example
 * ```tsx
 * <Dialog open={open} title="Delete item" onClose={() => open.set(false)}>
 *     This action cannot be undone.
 * </Dialog>
 * ```
 */
export function Dialog(props: DialogProps): Child {
    const isOpen = (): boolean => read(props.open) === true;
    let panel: HTMLElement | null = null;

    createEffect(() => {
        if (!isOpen()) {
            return;
        }

        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                props.onClose?.();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        onCleanup(() => {
            window.removeEventListener("keydown", onKeyDown);
            if (previous?.isConnected === true) {
                previous.focus();
            }
        });
        queueMicrotask(() => panel?.focus());
    });

    const onBackdropClick = (event: MouseEvent): void => {
        if (event.target === event.currentTarget) {
            props.onClose?.();
        }
    };

    return (
        <Show when={isOpen}>
            <div class="kyn-dialog__backdrop" onClick={onBackdropClick}>
                <div
                    class={cx("kyn-dialog", props.class)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={props.title}
                    tabIndex={-1}
                    ref={(element) => {
                        panel = element as HTMLElement | null;
                    }}
                >
                    <header class="kyn-dialog__header">
                        <h2 class="kyn-dialog__title">{props.title}</h2>
                        <button
                            type="button"
                            class="kyn-dialog__close"
                            aria-label="Close"
                            onClick={() => props.onClose?.()}
                        >
                            ×
                        </button>
                    </header>
                    <div class="kyn-dialog__body">{props.children}</div>
                    {props.footer !== undefined ? <footer class="kyn-dialog__footer">{props.footer}</footer> : null}
                </div>
            </div>
        </Show>
    );
}
