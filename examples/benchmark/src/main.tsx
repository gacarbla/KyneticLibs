import { createOurs } from "./ours.js";
import { createReact } from "./react.react.js";
import { runBenchmark, type Result } from "./bench.js";
import "./styles.css";

const oursHost = document.getElementById("ours") as HTMLElement;
const reactHost = document.getElementById("react") as HTMLElement;
const results = document.getElementById("results") as HTMLElement;
const runButton = document.getElementById("run") as HTMLButtonElement;

const ours = createOurs(oursHost);
const react = createReact(reactHost);

/** Renders the comparison table. */
function renderResults(rows: readonly Result[]): void {
    const body = rows
        .map((row) => {
            const ratio = row.react / row.ours;
            const winner = ratio >= 1 ? "ours" : "react";
            return `<tr class="${winner}">
                <td>${row.name}</td>
                <td>${row.ours.toFixed(2)} ms</td>
                <td>${row.react.toFixed(2)} ms</td>
                <td>${ratio.toFixed(2)}×</td>
            </tr>`;
        })
        .join("");

    results.innerHTML = `<table>
        <thead><tr><th>Operation</th><th>Kynetic</th><th>React 19</th><th>React / Kynetic</th></tr></thead>
        <tbody>${body}</tbody>
    </table>
    <p class="muted">Ratio &gt; 1 means Kynetic was faster. Median of ${5} rounds; production build.</p>`;
}

/** Runs the benchmark and paints the table. */
async function run(): Promise<readonly Result[]> {
    runButton.disabled = true;
    runButton.textContent = "Running…";
    try {
        const rows = await runBenchmark(ours, react, oursHost, reactHost);
        renderResults(rows);
        return rows;
    } finally {
        runButton.disabled = false;
        runButton.textContent = "Run benchmark";
    }
}

runButton.addEventListener("click", () => {
    void run();
});

// Exposed so the benchmark can be driven from the browser console.
(window as unknown as { runBenchmark: () => Promise<readonly Result[]> }).runBenchmark = run;
