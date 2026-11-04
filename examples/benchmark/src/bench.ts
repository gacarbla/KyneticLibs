import { DATA, ONE, REMOVED, REPLACED, SWAPPED, UPDATED, type Row } from "./data.js";

/** Minimal interface both implementations satisfy. */
export interface Runner {
    setRows(rows: readonly Row[]): void;
    dispose(): void;
}

export interface Result {
    readonly name: string;
    readonly ours: number;
    readonly react: number;
}

const SCENARIOS: ReadonlyArray<{ readonly name: string; readonly rows: readonly Row[] }> = [
    { name: "create 1 000", rows: DATA },
    { name: "update one", rows: ONE },
    { name: "update every 10th", rows: UPDATED },
    { name: "replace all", rows: REPLACED },
    { name: "reverse all", rows: SWAPPED },
    { name: "remove one", rows: REMOVED },
    { name: "clear", rows: [] },
];

const ROUNDS = 5;

/** Waits for the reactive scheduler and React's microtask commit. */
async function commit(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

/** Forces layout so the measured time includes the DOM work. */
function forceLayout(host: Element): void {
    host.getBoundingClientRect();
}

/** Measures a state change up to its committed DOM and layout work. */
async function measure(runner: Runner, rows: readonly Row[], host: Element): Promise<number> {
    const start = performance.now();
    runner.setRows(rows);
    await commit();
    forceLayout(host);
    return performance.now() - start;
}

/** Accumulates one full pass over the scenarios. */
async function round(runner: Runner, host: Element, samples: Map<string, number[]>): Promise<void> {
    runner.setRows([]);
    await commit();

    for (const scenario of SCENARIOS) {
        const elapsed = await measure(runner, scenario.rows, host);
        const bucket = samples.get(scenario.name) ?? [];
        bucket.push(elapsed);
        samples.set(scenario.name, bucket);
    }
}

/** Middle value of a sorted copy. */
function median(values: readonly number[]): number {
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? 0);
}

/**
 * Runs the same workload against both implementations.
 *
 * The first pass is a warm-up and is discarded; each operation is measured
 * until the next animation frame, including a forced layout.
 */
export async function runBenchmark(
    ours: Runner,
    react: Runner,
    oursHost: Element,
    reactHost: Element,
): Promise<Result[]> {
    // Warm-up.
    await round(ours, oursHost, new Map());
    await round(react, reactHost, new Map());

    const oursSamples = new Map<string, number[]>();
    const reactSamples = new Map<string, number[]>();

    for (let index = 0; index < ROUNDS; index += 1) {
        await round(ours, oursHost, oursSamples);
        await round(react, reactHost, reactSamples);
    }

    return SCENARIOS.map((scenario) => ({
        name: scenario.name,
        ours: median(oursSamples.get(scenario.name) ?? []),
        react: median(reactSamples.get(scenario.name) ?? []),
    }));
}
