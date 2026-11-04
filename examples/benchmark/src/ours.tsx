import { For, createSignal, render, type Signal } from "@kyneticweb/dom";
import type { Row } from "./data.js";

function List(props: { rows: Signal<Row[]> }) {
    return (
        <ul>
            <For each={props.rows} keyBy={(row) => row.id}>
                {(row) => <li class={row.id % 10 === 0 ? "even" : ""}>{row.label}</li>}
            </For>
        </ul>
    );
}

export function createOurs(host: Element) {
    const rows = createSignal<Row[]>([]);
    const dispose = render(() => <List rows={rows} />, host);

    return {
        setRows(next: readonly Row[]) {
            rows.set(next as Row[]);
        },
        dispose,
    };
}
