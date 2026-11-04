import type { Child } from "@kyneticweb/dom";
import { cx } from "./classes.js";

/** Props accepted by {@link Card}. */
export interface CardProps {
    /** Header title. */
    readonly title?: Child;
    /** Header actions, aligned to the end. */
    readonly actions?: Child;
    readonly class?: string;
    readonly children?: Child;
}

/**
 * Surface with an optional header and actions.
 *
 * @example
 * ```tsx
 * <Card title="Profile" actions={<Button>Edit</Button>}>
 *     <ProfileDetails />
 * </Card>
 * ```
 */
export function Card(props: CardProps): Child {
    const hasHeader = props.title !== undefined || props.actions !== undefined;

    return (
        <section class={cx("kyn-card", props.class)}>
            {hasHeader ? (
                <header class="kyn-card__header">
                    {props.title !== undefined ? <h3 class="kyn-card__title">{props.title}</h3> : null}
                    {props.actions !== undefined ? <div class="kyn-card__actions">{props.actions}</div> : null}
                </header>
            ) : null}
            <div class="kyn-card__body">{props.children}</div>
        </section>
    );
}
