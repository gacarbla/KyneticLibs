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
import {
    Badge,
    Button,
    Card,
    Checkbox,
    Dialog,
    Input,
    Menu,
    RadioGroup,
    Select,
    Spinner,
    Switch,
    Table,
    Tabs,
    Textarea,
} from "@kyneticweb/ui";
import "./styles.css";
import "@kyneticweb/ui/styles.css";

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

/** Demonstrates the component kit: buttons, inputs, select, menu, table, tabs and dialog. */
function Kit() {
    const notifications = createSignal(true);
    const running = createSignal(false);
    const confirming = createSignal(false);
    const accepted = createSignal(false);
    const email = createSignal("");
    const country = createSignal("es");
    const plan = createSignal("free");
    const bio = createSignal("");

    const countries = [
        {
            label: "Europe",
            options: [
                { value: "es", label: "Spain" },
                { value: "fr", label: "France", description: "French Republic" },
                { value: "gl", label: "Galicia" },
            ],
        },
        {
            label: "America",
            options: [
                { value: "mx", label: "Mexico" },
                { value: "ar", label: "Argentina" },
            ],
        },
    ];

    const people = [
        { name: "Ana", role: "Design" },
        { name: "Luis", role: "Engineering" },
        { name: "Marta", role: "Product" },
    ];
    const columns = [
        { key: "name", header: "Name", sortable: true },
        { key: "role", header: "Role" },
    ] as const;

    const emailError = (): string | undefined =>
        email().length === 0 || email().includes("@") ? undefined : "Write a valid email";

    const runTask = (): void => {
        running.set(true);
        setTimeout(() => running.set(false), 900);
    };

    return (
        <Card title="Component kit" actions={<Badge tone="info">@kyneticweb/ui</Badge>}>
            <div class="row wrap">
                <Button variant="primary">Primary</Button>
                <Button>Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="danger" onClick={() => confirming.set(true)}>
                    Delete…
                </Button>
                <Button variant="link">Link</Button>
                <Button loading={running} onClick={runTask}>
                    Run task
                </Button>
            </div>

            <div class="row spread kit-row">
                <Switch checked={notifications} onChange={notifications.set} label="Notifications" />
                <Badge tone="success">{() => (notifications() ? "enabled" : "disabled")}</Badge>
            </div>

            <div class="kit-grid">
                <Input
                    label="Email"
                    type="email"
                    value={email}
                    error={emailError}
                    placeholder="you@example.com"
                    onInput={(event) => email.set((event.target as HTMLInputElement).value)}
                />
                <Select label="Country" items={countries} value={country} onChange={country.set} searchable clearable />
            </div>

            <Textarea
                label="Message"
                rows={3}
                value={bio}
                placeholder="Tell us something…"
                onInput={(event) => bio.set((event.target as HTMLTextAreaElement).value)}
            />

            <div class="row wrap kit-row">
                <Checkbox checked={accepted} onChange={accepted.set} label="Accept the terms" />
                <Menu
                    label="Actions"
                    items={[
                        { id: "copy", label: "Copy link", shortcut: "Ctrl C", onSelect: () => undefined },
                        { id: "archive", label: "Archive", onSelect: () => undefined },
                        {
                            id: "remove",
                            label: "Remove",
                            danger: true,
                            separatorBefore: true,
                            onSelect: () => confirming.set(true),
                        },
                    ]}
                />
            </div>

            <RadioGroup
                name="plan"
                label="Plan"
                value={plan}
                onChange={plan.set}
                options={[
                    { value: "free", label: "Free" },
                    { value: "pro", label: "Pro" },
                    { value: "team", label: "Team" },
                ]}
            />

            <div class="kit-table">
                <Table columns={columns} rows={people} striped compact />
            </div>

            <Tabs
                items={[
                    {
                        id: "signals",
                        label: "Signals",
                        content: <p class="muted">Fine-grained updates without re-renders.</p>,
                    },
                    {
                        id: "ssr",
                        label: "SSR",
                        content: <p class="muted">Streaming and hydration included.</p>,
                    },
                ]}
            />

            <p class="muted kit-spinner">
                <Spinner size="sm" /> Loading indicator
            </p>

            <Dialog
                open={confirming}
                title="Delete item"
                onClose={() => confirming.set(false)}
                footer={
                    <>
                        <Button onClick={() => confirming.set(false)}>Cancel</Button>
                        <Button variant="danger" onClick={() => confirming.set(false)}>
                            Delete
                        </Button>
                    </>
                }
            >
                This is a demo; nothing will be deleted.
            </Dialog>
        </Card>
    );
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
                <Kit />
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
