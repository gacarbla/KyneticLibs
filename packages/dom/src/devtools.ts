import type { Owner } from "@kyneticweb/reactive";

/**
 * Development hook for component lifecycle events.
 *
 * It is disabled by default. When a hook is installed, every component mount
 * and unmount emits an event, which devtools uses to rebuild the component
 * tree. The hook never receives DOM nodes, so it stays cheap.
 */

/** Event emitted when a component mounts or unmounts. */
export interface ComponentDevtoolsEvent {
    readonly kind: "mount" | "unmount";
    /** Stable id for the lifetime of the component instance. */
    readonly id: number;
    /** Component name, taken from `displayName` or the function name. */
    readonly name: string;
    /** Id of the nearest parent component, or `null` at the root. */
    readonly parent: number | null;
}

/** Listener installed by devtools. */
export type DevtoolsHook = (event: ComponentDevtoolsEvent) => void;

/** Registration returned when a component is tracked. */
export interface ComponentRegistration {
    readonly id: number;
    readonly parent: number | null;
}

let hook: DevtoolsHook | null = null;
let nextId = 1;
const componentOwners = new WeakMap<Owner, number>();

/**
 * Installs the devtools hook and returns the previous one.
 *
 * @param next Hook to install, or `null` to disable instrumentation.
 * @returns The hook that was active before.
 */
export function setDevtoolsHook(next: DevtoolsHook | null): DevtoolsHook | null {
    const previous = hook;
    hook = next;
    return previous;
}

/** Reports whether a devtools hook is installed. */
export function isDevtoolsEnabled(): boolean {
    return hook !== null;
}

/**
 * Registers a mounted component.
 *
 * @internal Called by the component factory.
 * @param owner Owner created for the component.
 * @param parentOwner Owner that contains it.
 * @param name Component name.
 * @returns The id and parent id used by the unmount event.
 */
export function registerComponent(owner: Owner | null, parentOwner: Owner | null, name: string): ComponentRegistration {
    const id = nextId++;
    if (owner !== null) {
        componentOwners.set(owner, id);
    }
    const parent = parentOwner === null ? null : (componentOwners.get(parentOwner) ?? null);
    emit({ kind: "mount", id, name, parent });
    return { id, parent };
}

/**
 * Emits the unmount event for a tracked component.
 *
 * @internal Called from the component cleanup.
 */
export function unregisterComponent(registration: ComponentRegistration, name: string): void {
    emit({ kind: "unmount", id: registration.id, name, parent: registration.parent });
}

/**
 * Links a helper owner (context scope, view owner) to the component that
 * created it, so components inside it keep the right parent in the tree.
 *
 * @internal
 * @param owner Scope owner to link.
 * @param parent Owner that created the scope.
 */
export function linkOwner(owner: Owner, parent: Owner | null): void {
    if (hook === null || parent === null) {
        return;
    }
    const id = componentOwners.get(parent);
    if (id !== undefined) {
        componentOwners.set(owner, id);
    }
}

/** Delivers an event, never letting a hook break rendering. */
function emit(event: ComponentDevtoolsEvent): void {
    if (hook === null) {
        return;
    }
    try {
        hook(event);
    } catch {
        // Devtools must not affect the application.
    }
}
