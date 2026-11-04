import { createEffect, onCleanup } from "@kyneticweb/dom";

/** Options for {@link useDismiss}. */
export interface DismissOptions {
    readonly isOpen: () => boolean;
    readonly close: () => void;
    readonly panel: () => HTMLElement | null;
    readonly trigger?: () => HTMLElement | null;
}

/**
 * Closes a floating panel on an outside click or Escape.
 *
 * Runs only while the panel is open, and only on the client (effects are
 * skipped during server rendering).
 */
export function useDismiss(options: DismissOptions): void {
    createEffect(() => {
        if (!options.isOpen()) {
            return;
        }

        const onPointerDown = (event: MouseEvent): void => {
            const target = event.target as Node | null;
            if (target === null) {
                return;
            }
            if (options.panel()?.contains(target) === true) {
                return;
            }
            if (options.trigger?.()?.contains(target) === true) {
                return;
            }
            options.close();
        };
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                options.close();
                options.trigger?.()?.focus();
            }
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        onCleanup(() => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        });
    });
}

/** Places a fixed panel under (or above) its trigger. */
export function positionPanel(panel: HTMLElement, trigger: HTMLElement, align: "start" | "end" = "start"): void {
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 200);
    const height = panel.offsetHeight;
    const below = rect.bottom + 6;
    const above = rect.top - height - 6;
    const left = align === "end" ? rect.right - width : rect.left;

    panel.style.position = "fixed";
    panel.style.minWidth = `${width}px`;
    panel.style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
    panel.style.top = `${below + height > window.innerHeight - 8 && above > 8 ? above : below}px`;
}

/**
 * Keeps a floating panel anchored while it is open.
 *
 * Repositions on resize and scroll; the panel is also positioned from its ref
 * callback, which runs before this effect.
 */
export function usePlacement(
    isOpen: () => boolean,
    panel: () => HTMLElement | null,
    trigger: () => HTMLElement | null,
    align: "start" | "end" = "start",
): void {
    createEffect(() => {
        if (!isOpen()) {
            return;
        }

        const place = (): void => {
            const currentPanel = panel();
            const currentTrigger = trigger();
            if (currentPanel !== null && currentTrigger !== null) {
                positionPanel(currentPanel, currentTrigger, align);
            }
        };

        queueMicrotask(place);
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        onCleanup(() => {
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        });
    });
}
