import {
    createComputed,
    createContext,
    createEffect,
    createSignal,
    For,
    onMount,
    render,
    Show,
    useContext,
} from "@kyneticweb/dom";
import "./styles.css";

type Theme = "light" | "dark";

/** Static context: components read it during setup. */
const BrandContext = createContext("kynetic");

interface Todo {
    readonly id: number;
    readonly text: string;
    readonly done: boolean;
}

/** Counter with a computed value and fine-grained text updates. */
function Counter() {
    const count = createSignal(0);
    const doubled = createComputed(() => count() * 2);

    return (
        <section class="card">
            <h2>Counter</h2>
            <div class="row">
                <button onClick={() => count.update((value) => value - 1)}>−</button>
                <output>{count()}</output>
                <button onClick={() => count.update((value) => value + 1)}>+</button>
            </div>
            <p class="muted">Double: {doubled()}</p>
        </section>
    );
}

/** Todo list: controlled input, mapped children and a computed summary. */
function Todos() {
    const items = createSignal<Todo[]>([
        { id: 1, text: "Read the Kynetic docs", done: false },
        { id: 2, text: "Build something small", done: true },
    ]);
    const draft = createSignal("");
    let input: HTMLInputElement | null = null;

    onMount(() => input?.focus());

    const add = (): void => {
        const text = draft().trim();
        if (text.length === 0) {
            return;
        }
        items.update((list) => [...list, { id: Date.now(), text, done: false }]);
        draft.set("");
        input?.focus();
    };

    const toggle = (id: number): void => {
        items.update((list) => list.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
    };

    const remove = (id: number): void => {
        items.update((list) => list.filter((todo) => todo.id !== id));
    };

    const pending = createComputed(() => items().filter((todo) => !todo.done).length);

    return (
        <section class="card">
            <h2>Todos</h2>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    add();
                }}
            >
                <input
                    ref={(element) => {
                        input = element as HTMLInputElement | null;
                    }}
                    value={draft()}
                    onInput={(event) => draft.set((event.target as HTMLInputElement).value)}
                    placeholder="What needs doing?"
                    aria-label="New todo"
                />
                <button class="primary" type="submit">
                    Add
                </button>
            </form>

            <ul>
                <For each={items} keyBy={(todo) => todo.id}>
                    {(todo) => (
                        <li class={todo.done ? "done" : ""}>
                            <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
                            <span class="label">{todo.text}</span>
                            <button class="remove" onClick={() => remove(todo.id)} aria-label={`Remove ${todo.text}`}>
                                ✕
                            </button>
                        </li>
                    )}
                </For>
            </ul>

            <Show when={() => pending() === 0} fallback={<p class="muted">{pending()} pending</p>}>
                <p class="empty">Everything done.</p>
            </Show>
        </section>
    );
}

/** Reads the context provided by the app. */
function Brand() {
    const brand = useContext(BrandContext);
    return <span class="badge">{brand}</span>;
}

/** Root component: theme signal, effect and layout. */
function App() {
    const theme = createSignal<Theme>("light");

    createEffect(() => {
        document.documentElement.dataset["theme"] = theme();
    });

    return (
        <>
            <header>
                <h1>Kynetic DOM</h1>
                <button onClick={() => theme.set(theme() === "light" ? "dark" : "light")}>
                    {theme() === "light" ? "Dark mode" : "Light mode"}
                </button>
            </header>

            <main>
                <Counter />
                <Todos />
                <section class="card">
                    <h2>Context</h2>
                    <p class="muted">
                        Provided by{" "}
                        <BrandContext.Provider value="kynetic">
                            <Brand />
                        </BrandContext.Provider>
                    </p>
                </section>
            </main>

            <footer>
                <p class="muted">Signals + a JSX compiler. No virtual DOM, no re-renders.</p>
            </footer>
        </>
    );
}

// The panel is opt-in and code-split: open the page with ?devtools.
async function main(): Promise<void> {
    if (new URLSearchParams(location.search).has("devtools")) {
        const { createDevtools } = await import("@kyneticweb/devtools");
        createDevtools();
    }
    render(() => <App />, document.getElementById("app")!);
}

void main();
