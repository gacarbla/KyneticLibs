import type { Child } from "@kyneticweb/dom";
import { read } from "./classes.js";

/** Error message, or an accessor for reactive validation. */
export type FieldError = string | null | undefined | (() => string | null | undefined);

/** Props shared by form controls. */
export interface FieldMessagesProps {
    readonly label?: string;
    readonly hint?: string;
    readonly error?: FieldError;
    readonly required?: boolean;
}

/** Hint and error lines shared by form controls. */
export function fieldMessages(props: FieldMessagesProps): Child {
    return (
        <>
            {props.hint !== undefined ? <span class="kyn-field__hint">{props.hint}</span> : null}
            {(): Child => {
                const error = read(props.error);
                return error ? (
                    <span class="kyn-field__error" role="alert">
                        {error}
                    </span>
                ) : null;
            }}
        </>
    );
}

/** Accessor used for `aria-invalid`. */
export function invalidAccessor(props: FieldMessagesProps): () => string | undefined {
    return () => (read(props.error) ? "true" : undefined);
}
