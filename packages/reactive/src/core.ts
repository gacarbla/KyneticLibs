import type { Accessor, Computed, Dispose, Setter, Signal, SignalOptions } from "./types.js";

/**
 * Reactive graph.
 *
 * A signal is a source; memos and effects are computations that observe
 * sources. Reading a source while a computation is running links them, so
 * dependencies are discovered automatically and never declared by hand.
 */

type ComputationKind = "effect" | "memo";

/** Anything a computation can depend on. */
interface Source {
    readonly observers: Set<Computation>;
}

/** A reactive computation: a memo or an effect. */
interface Computation extends Source {
    readonly kind: ComputationKind;
    readonly fn: () => unknown;
    readonly sources: Set<Source>;
    readonly cleanups: Dispose[];
    dirty: boolean;
    disposed: boolean;
    running: boolean;
    hasValue: boolean;
    value: unknown;
}

/** Scope that owns cleanups for a component or a root. */
interface Owner {
    readonly cleanups: Dispose[];
}

let currentComputation: Computation | null = null;
let currentOwner: Owner | null = null;

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

/** Registers the running computation as an observer of `source`. */
function track(source: Source): void {
    const computation = currentComputation;
    if (computation === null || computation.disposed) {
        return;
    }
    if (source.observers.has(computation)) {
        return;
    }
    source.observers.add(computation);
    computation.sources.add(source);
}

/** Drops every dependency of a computation before it runs again. */
function cleanSources(computation: Computation): void {
    for (const source of computation.sources) {
        source.observers.delete(computation);
    }
    computation.sources.clear();
}

/** Runs the registered cleanups in reverse order and empties the list. */
function runCleanups(computation: Computation): void {
    const cleanups = computation.cleanups.splice(0).reverse();
    for (const cleanup of cleanups) {
        cleanup();
    }
}

/** Notifies the observers of a changed source. */
function notify(source: Source): void {
    for (const observer of [...source.observers]) {
        markDirty(observer);
    }
}

/** Marks a computation as stale and schedules it when it is an effect. */
function markDirty(computation: Computation): void {
    if (computation.disposed) {
        return;
    }

    if (computation.kind === "memo") {
        if (computation.dirty) {
            return;
        }
        computation.dirty = true;
        for (const observer of [...computation.observers]) {
            markDirty(observer);
        }
        return;
    }

    scheduleEffect(computation);
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

const pendingEffects = new Set<Computation>();
let batchDepth = 0;
let flushScheduled = false;

/** Queues an effect for the next flush. */
function scheduleEffect(computation: Computation): void {
    pendingEffects.add(computation);
    if (batchDepth > 0 || flushScheduled) {
        return;
    }
    flushScheduled = true;
    queueMicrotask(flush);
}

/** Runs every pending effect, including the ones they create. */
function flush(): void {
    flushScheduled = false;
    if (batchDepth > 0) {
        return;
    }

    let iterations = 0;
    while (pendingEffects.size > 0) {
        if (iterations++ > 1000) {
            pendingEffects.clear();
            throw new Error("Reactive update cycle exceeded 1000 iterations.");
        }
        const work = [...pendingEffects];
        pendingEffects.clear();
        for (const computation of work) {
            runEffect(computation);
        }
    }
}

/**
 * Groups writes so dependent effects run once.
 *
 * @example
 * ```ts
 * batch(() => {
 *     first.set(1);
 *     second.set(2);
 * }); // effects run once, after both writes
 * ```
 */
export function batch<T>(fn: () => T): T {
    batchDepth += 1;
    try {
        return fn();
    } finally {
        batchDepth -= 1;
        if (batchDepth === 0) {
            flush();
        }
    }
}

/**
 * Runs `fn` without subscribing the running computation.
 *
 * @example
 * ```ts
 * createEffect(() => {
 *     const tracked = count();      // dependency
 *     const ignored = untrack(() => other()); // not a dependency
 * });
 * ```
 */
export function untrack<T>(fn: () => T): T {
    const previous = currentComputation;
    currentComputation = null;
    try {
        return fn();
    } finally {
        currentComputation = previous;
    }
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

/**
 * Creates an observable value.
 *
 * @param initial Initial value.
 * @param options Equality used to decide whether a write notifies.
 * @returns Callable accessor with `set`, `update` and `peek`.
 *
 * @example
 * ```ts
 * const count = createSignal(0);
 * count();                    // 0
 * count.set(2);               // 2
 * count.update((value) => value + 1); // 3
 * ```
 */
export function createSignal<T>(initial: T, options: SignalOptions<T> = {}): Signal<T> {
    const equals = options.equals ?? Object.is;
    const source: Source = { observers: new Set<Computation>() };
    let value = initial;

    const accessor = (() => {
        track(source);
        return value;
    }) as Signal<T>;

    const set: Setter<T> = (next) => {
        const resolved = typeof next === "function" ? (next as (previous: T) => T)(value) : next;
        if (equals(value, resolved)) {
            return value;
        }
        value = resolved;
        notify(source);
        return value;
    };

    accessor.set = set;
    accessor.update = (derive) => set(derive(value));
    accessor.peek = () => value;

    return accessor;
}

// ---------------------------------------------------------------------------
// Computed values
// ---------------------------------------------------------------------------

/** Reads a memo, recomputing it only when it is stale. */
function readMemo<T>(computation: Computation): T {
    track(computation);

    if (computation.running) {
        return computation.value as T;
    }
    if (!computation.dirty && computation.hasValue) {
        return computation.value as T;
    }

    cleanSources(computation);
    const previous = currentComputation;
    currentComputation = computation;
    computation.running = true;
    try {
        computation.value = computation.fn();
        computation.hasValue = true;
        computation.dirty = false;
        return computation.value as T;
    } finally {
        computation.running = false;
        currentComputation = previous;
    }
}

/**
 * Creates a cached, lazily evaluated value derived from other reactive values.
 *
 * Dependencies are discovered automatically while `fn` runs.
 *
 * @example
 * ```ts
 * const count = createSignal(2);
 * const doubled = createComputed(() => count() * 2);
 * doubled(); // 4
 * ```
 */
export function createComputed<T>(fn: () => T): Computed<T> {
    const computation: Computation = {
        kind: "memo",
        fn,
        observers: new Set(),
        sources: new Set(),
        cleanups: [],
        dirty: true,
        disposed: false,
        running: false,
        hasValue: false,
        value: undefined,
    };

    const accessor = (() => readMemo<T>(computation)) as Computed<T>;
    accessor.peek = () => untrack(() => readMemo<T>(computation));
    accessor.dispose = () => disposeComputation(computation);

    if (currentOwner !== null) {
        currentOwner.cleanups.push(accessor.dispose);
    }

    return accessor;
}

/** Releases a computation: cleanups, dependencies and observers. */
function disposeComputation(computation: Computation): void {
    if (computation.disposed) {
        return;
    }
    computation.disposed = true;
    runCleanups(computation);
    cleanSources(computation);
    computation.observers.clear();
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

/** Executes an effect body and re-collects its dependencies. */
function runEffect(computation: Computation): void {
    if (computation.disposed) {
        return;
    }

    runCleanups(computation);
    cleanSources(computation);

    const previous = currentComputation;
    currentComputation = computation;
    computation.running = true;
    try {
        const result = computation.fn();
        if (typeof result === "function") {
            computation.cleanups.push(result as Dispose);
        }
        computation.dirty = false;
    } finally {
        computation.running = false;
        currentComputation = previous;
    }
}

/**
 * Runs `fn` immediately and again whenever a reactive value it read changes.
 *
 * The body may return a cleanup function, or call {@link onCleanup}. Cleanups
 * run before each re-execution and when the effect is disposed.
 *
 * @param fn Effect body.
 * @returns Function that disposes the effect.
 *
 * @example
 * ```ts
 * const stop = createEffect(() => console.log(count()));
 * stop();
 * ```
 */
export function createEffect(fn: () => unknown): Dispose {
    const computation: Computation = {
        kind: "effect",
        fn,
        observers: new Set(),
        sources: new Set(),
        cleanups: [],
        dirty: false,
        disposed: false,
        running: false,
        hasValue: false,
        value: undefined,
    };

    const dispose = () => {
        if (computation.disposed) {
            return;
        }
        computation.disposed = true;
        runCleanups(computation);
        cleanSources(computation);
    };

    if (currentComputation !== null) {
        currentComputation.cleanups.push(dispose);
    } else if (currentOwner !== null) {
        currentOwner.cleanups.push(dispose);
    }

    runEffect(computation);
    return dispose;
}

/**
 * Registers a cleanup for the running effect or the current owner.
 *
 * @example
 * ```ts
 * createRoot(() => {
 *     const timer = setInterval(tick, 1000);
 *     onCleanup(() => clearInterval(timer));
 * });
 * ```
 */
export function onCleanup(fn: Dispose): void {
    if (currentComputation !== null) {
        currentComputation.cleanups.push(fn);
        return;
    }
    if (currentOwner !== null) {
        currentOwner.cleanups.push(fn);
    }
}

/**
 * Creates an ownership scope. Every effect and cleanup created inside `fn` is
 * released when the returned disposer runs (or when the parent scope ends).
 *
 * @example
 * ```ts
 * const dispose = createRoot((release) => {
 *     createEffect(() => console.log(count()));
 *     return release;
 * });
 * dispose();
 * ```
 */
export function createRoot<T>(fn: (dispose: Dispose) => T): T {
    const owner: Owner = { cleanups: [] };
    const parentOwner = currentOwner;
    const parentComputation = currentComputation;

    const dispose = (): void => {
        const cleanups = owner.cleanups.splice(0).reverse();
        for (const cleanup of cleanups) {
            cleanup();
        }
    };

    if (parentComputation !== null) {
        parentComputation.cleanups.push(dispose);
    } else if (parentOwner !== null) {
        parentOwner.cleanups.push(dispose);
    }

    currentOwner = owner;
    try {
        return fn(dispose);
    } finally {
        currentOwner = parentOwner;
    }
}

/** Runs `fn` as the owner of the current scope, without creating a new one. */
export function runWithOwner<T>(owner: Owner, fn: () => T): T {
    const previous = currentOwner;
    currentOwner = owner;
    try {
        return fn();
    } finally {
        currentOwner = previous;
    }
}

/** @internal Creates an owner without exposing it in the public API. */
export function createOwner(): Owner {
    return { cleanups: [] };
}

/** @internal Disposes an owner created with {@link createOwner}. */
export function disposeOwner(owner: Owner): void {
    const cleanups = owner.cleanups.splice(0).reverse();
    for (const cleanup of cleanups) {
        cleanup();
    }
}

export type { Accessor, Computed, Dispose, Setter, Signal, SignalOptions };
