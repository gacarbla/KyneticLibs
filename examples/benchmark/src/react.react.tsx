/** @jsxImportSource react */
import { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Row } from "./data.js";

function List({ rows }: { rows: readonly Row[] }) {
    return (
        <ul>
            {rows.map((row) => (
                <li key={row.id} className={row.id % 10 === 0 ? "even" : ""}>
                    {row.label}
                </li>
            ))}
        </ul>
    );
}

export function createReact(host: Element) {
    let setRows: ((rows: readonly Row[]) => void) | null = null;

    function App() {
        const [rows, update] = useState<readonly Row[]>([]);
        setRows = update;
        return <List rows={rows} />;
    }

    const root = createRoot(host);
    root.render(<App />);

    return {
        setRows(next: readonly Row[]) {
            flushSync(() => setRows?.(next));
        },
        dispose() {
            root.unmount();
        },
    };
}
