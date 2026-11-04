import { createSignal, Show, type Child } from "@kyneticweb/dom";
import { cx, sizeToken, type SizeInput } from "./classes.js";

/** Tones available to {@link Alert}. */
export type AlertTone = "info" | "success" | "warning" | "danger";

/** Props accepted by {@link Alert}. */
export interface AlertProps {
    readonly tone?: AlertTone;
    readonly title?: string;
    readonly children?: Child;
    /** Shows a close button that hides the alert and calls `onDismiss`. */
    readonly dismissible?: boolean;
    readonly onDismiss?: () => void;
    /** Replaces the tone dot with an icon. */
    readonly icon?: Child;
    readonly size?: SizeInput;
    readonly class?: string;
}

/**
 * Inline message for feedback and status.
 *
 * @example
 * ```tsx
 * <Alert tone="success" title="Saved" dismissible>Your changes are live.</Alert>
 * ```
 */
export function Alert(props: AlertProps): Child {
    const dismissed = createSignal(false);

    return (
        <Show when={() => !dismissed()}>
            <div
                class={cx(
                    "kyn-alert",
                    `kyn-alert--${props.tone ?? "info"}`,
                    `kyn-alert--${sizeToken(props.size)}`,
                    props.class,
                )}
                role="alert"
            >
                {props.icon !== undefined ? (
                    <span class="kyn-alert__icon" aria-hidden="true">
                        {props.icon}
                    </span>
                ) : (
                    <span class="kyn-alert__dot" aria-hidden="true" />
                )}
                <div class="kyn-alert__content">
                    {props.title !== undefined ? <strong class="kyn-alert__title">{props.title}</strong> : null}
                    {props.children !== undefined ? <div class="kyn-alert__body">{props.children}</div> : null}
                </div>
                {props.dismissible === true ? (
                    <button
                        type="button"
                        class="kyn-alert__close"
                        aria-label="Dismiss"
                        onClick={() => {
                            dismissed.set(true);
                            props.onDismiss?.();
                        }}
                    >
                        ×
                    </button>
                ) : null}
            </div>
        </Show>
    );
}
