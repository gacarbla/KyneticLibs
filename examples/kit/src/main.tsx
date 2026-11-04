import { createEffect, createSignal, render, type Child } from "@kyneticweb/dom";
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Checkbox,
    Dialog,
    Input,
    Menu,
    Progress,
    RadioGroup,
    Select,
    Slider,
    Spinner,
    Switch,
    Table,
    Tabs,
    Textarea,
    type MenuItem,
    type SelectItem,
    type TabItem,
    type TableColumn,
} from "@kyneticweb/ui";
import "@kyneticweb/ui/styles.css";
import "./styles.css";

const SIZES = ["small", "medium", "large"] as const;
const BUTTON_VARIANTS = ["primary", "secondary", "ghost", "success", "warning", "danger", "info", "link"] as const;
const TONES = ["neutral", "info", "success", "warning", "danger"] as const;
const ALERT_TONES = ["info", "success", "warning", "danger"] as const;
const AVATAR_SIZES = ["xs", "small", "medium", "large"] as const;

const SECTIONS = [
    { id: "buttons", title: "1. Buttons" },
    { id: "inputs", title: "2. Inputs" },
    { id: "selects", title: "3. Selects" },
    { id: "choices", title: "4. Checkboxes & radios" },
    { id: "switches", title: "5. Switches" },
    { id: "sliders", title: "6. Sliders" },
    { id: "badges", title: "7. Badges" },
    { id: "avatars", title: "8. Avatars" },
    { id: "alerts", title: "9. Alerts" },
    { id: "progress", title: "10. Progress & spinners" },
    { id: "tabs", title: "11. Tabs" },
    { id: "menus", title: "12. Menus" },
    { id: "tables", title: "13. Tables" },
    { id: "dialogs", title: "14. Dialogs" },
] as const;

const COUNTRIES: readonly SelectItem[] = [
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

interface Person {
    readonly name: string;
    readonly role: string;
    readonly age: number;
}

const PEOPLE: readonly Person[] = [
    { name: "Ana", role: "Design", age: 31 },
    { name: "Luis", role: "Engineering", age: 42 },
    { name: "Marta", role: "Product", age: 27 },
];

const COLUMNS: readonly TableColumn<Person>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "role", header: "Role" },
    { key: "age", header: "Age", align: "end", width: "90px" },
];

/** Page section wrapper. */
function Section(props: { id: string; title: string; description: string; children?: Child }): Child {
    return (
        <section id={props.id} class="section">
            <header class="section__header">
                <h2>{props.title}</h2>
                <p>{props.description}</p>
            </header>
            <div class="demo-grid">{props.children}</div>
        </section>
    );
}

/** One demo tile with a label. */
function Demo(props: { label: string; wide?: boolean; children?: Child }): Child {
    return (
        <div class={props.wide === true ? "demo demo--wide" : "demo"}>
            <span class="demo__label">{props.label}</span>
            <div class="demo__content">{props.children}</div>
        </div>
    );
}

function ButtonsSection(): Child {
    return (
        <Section
            id="buttons"
            title="Buttons"
            description="Eight variants, three sizes, loading, disabled and block mode."
        >
            <Demo label="Variants" wide>
                <div class="row wrap">
                    {BUTTON_VARIANTS.map((variant) => (
                        <Button variant={variant}>{variant}</Button>
                    ))}
                </div>
            </Demo>
            <Demo label="Sizes">
                <div class="row wrap">
                    {SIZES.map((size) => (
                        <Button variant="primary" size={size}>
                            {size}
                        </Button>
                    ))}
                </div>
            </Demo>
            <Demo label="States">
                <div class="stack">
                    <Button loading>Loading</Button>
                    <Button disabled>Disabled</Button>
                    <Button variant="primary" block>
                        Block button
                    </Button>
                </div>
            </Demo>
        </Section>
    );
}

function InputsSection(): Child {
    return (
        <Section
            id="inputs"
            title="Inputs"
            description="Every native type, three sizes, hints, errors and disabled states."
        >
            <Demo label="Types" wide>
                <div class="grid-2">
                    <Input label="Text" placeholder="Type here" />
                    <Input label="Email" type="email" placeholder="you@example.com" />
                    <Input label="Password" type="password" defaultValue="secret" />
                    <Input label="Number" type="number" defaultValue="42" />
                    <Input label="Search" type="search" placeholder="Search…" />
                    <Input label="Date" type="date" />
                    <Input label="Telephone" type="tel" placeholder="+34 600 000 000" />
                    <Input label="URL" type="url" placeholder="https://example.com" />
                </div>
            </Demo>
            <Demo label="Sizes">
                <div class="stack">
                    {SIZES.map((size) => (
                        <Input size={size} label={size} placeholder={size} />
                    ))}
                </div>
            </Demo>
            <Demo label="States">
                <div class="stack">
                    <Input label="With hint" hint="Helper text below the field" />
                    <Input label="With error" error="This field is required" defaultValue="bad" />
                    <Input label="Disabled" disabled defaultValue="Disabled" />
                    <Input label="Read only" readOnly defaultValue="Read only" />
                    <Textarea label="Textarea" rows={3} placeholder="Multi-line…" />
                </div>
            </Demo>
        </Section>
    );
}

function SelectsSection(): Child {
    const country = createSignal("es");

    return (
        <Section
            id="selects"
            title="Selects"
            description="Searchable or plain, grouped by category, clearable and sized."
        >
            <Demo label="Searchable + groups" wide>
                <Select label="Country" items={COUNTRIES} value={country} onChange={country.set} searchable clearable />
            </Demo>
            <Demo label="Sizes">
                <div class="stack">
                    {SIZES.map((size) => (
                        <Select size={size} label={size} items={COUNTRIES} defaultValue="es" />
                    ))}
                </div>
            </Demo>
            <Demo label="Plain and disabled">
                <div class="stack">
                    <Select
                        label="Plain"
                        items={[
                            { value: "a", label: "Option A" },
                            { value: "b", label: "Option B" },
                            { value: "c", label: "Option C" },
                        ]}
                        defaultValue="a"
                    />
                    <Select label="Disabled" items={COUNTRIES} disabled />
                </div>
            </Demo>
        </Section>
    );
}

function ChoicesSection(): Child {
    const accepted = createSignal(true);
    const mixed = createSignal(false);
    const plan = createSignal("pro");

    return (
        <Section
            id="choices"
            title="Checkboxes & radios"
            description="Checked, indeterminate, disabled and native radio groups."
        >
            <Demo label="Checkboxes">
                <div class="stack">
                    <Checkbox checked={accepted} onChange={accepted.set} label="Checked" />
                    <Checkbox checked={mixed} indeterminate onChange={mixed.set} label="Indeterminate" />
                    <Checkbox checked={false} label="Unchecked" />
                    <Checkbox checked={false} disabled label="Disabled" />
                </div>
            </Demo>
            <Demo label="Radio group">
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
            </Demo>
            <Demo label="Radio with error">
                <RadioGroup
                    name="size"
                    label="Company size"
                    value={() => ""}
                    error="Choose an option"
                    options={[
                        { value: "s", label: "1–10" },
                        { value: "m", label: "11–50" },
                    ]}
                />
            </Demo>
        </Section>
    );
}

function SwitchesSection(): Child {
    const small = createSignal(true);
    const medium = createSignal(true);
    const large = createSignal(false);

    return (
        <Section id="switches" title="Switches" description="Three sizes, on/off states and disabled variants.">
            <Demo label="Sizes">
                <div class="stack">
                    <Switch size="small" checked={small} onChange={small.set} label="Small" />
                    <Switch size="medium" checked={medium} onChange={medium.set} label="Medium" />
                    <Switch size="large" checked={large} onChange={large.set} label="Large" />
                </div>
            </Demo>
            <Demo label="States">
                <div class="stack">
                    <Switch checked={true} label="Always on" />
                    <Switch checked={false} label="Off" />
                    <Switch checked={true} disabled label="Disabled on" />
                </div>
            </Demo>
        </Section>
    );
}

function SlidersSection(): Child {
    const small = createSignal(20);
    const medium = createSignal(50);
    const large = createSignal(80);
    const stepped = createSignal(30);

    return (
        <Section id="sliders" title="Sliders" description="Sizes, steps, ranges and disabled sliders.">
            <Demo label="Sizes" wide>
                <div class="stack">
                    <Slider size="small" label="Small" value={small} onChange={small.set} />
                    <Slider size="medium" label="Medium" value={medium} onChange={medium.set} />
                    <Slider size="large" label="Large" value={large} onChange={large.set} />
                </div>
            </Demo>
            <Demo label="Step and disabled">
                <div class="stack">
                    <Slider label="Step 10" min={0} max={100} step={10} value={stepped} onChange={stepped.set} />
                    <Slider label="Disabled" value={40} disabled />
                </div>
            </Demo>
        </Section>
    );
}

function BadgesSection(): Child {
    return (
        <Section id="badges" title="Badges" description="Five tones, three sizes and a status dot.">
            <Demo label="Tones" wide>
                <div class="row wrap">
                    {TONES.map((tone) => (
                        <Badge tone={tone}>{tone}</Badge>
                    ))}
                </div>
            </Demo>
            <Demo label="Sizes">
                <div class="row wrap">
                    {SIZES.map((size) => (
                        <Badge size={size} tone="info">
                            {size}
                        </Badge>
                    ))}
                </div>
            </Demo>
            <Demo label="With dot">
                <div class="row wrap">
                    <Badge dot tone="success">
                        Online
                    </Badge>
                    <Badge dot tone="warning">
                        Away
                    </Badge>
                    <Badge dot tone="danger">
                        Busy
                    </Badge>
                    <Badge dot tone="neutral">
                        Offline
                    </Badge>
                </div>
            </Demo>
        </Section>
    );
}

function AvatarsSection(): Child {
    return (
        <Section id="avatars" title="Avatars" description="Initials or images, five sizes, square shape and presence.">
            <Demo label="Sizes" wide>
                <div class="row wrap end">
                    {AVATAR_SIZES.map((size) => (
                        <Avatar name="Ana Pérez" size={size} />
                    ))}
                </div>
            </Demo>
            <Demo label="Status">
                <div class="row wrap">
                    <Avatar name="Ana Pérez" status="online" />
                    <Avatar name="Luis Gómez" status="busy" />
                    <Avatar name="Marta Río" status="away" />
                    <Avatar name="Noah Kim" status="offline" />
                </div>
            </Demo>
            <Demo label="Shape">
                <div class="row wrap">
                    <Avatar name="Ana Pérez" size="large" shape="square" />
                    <Avatar name="Kynetic" shape="square" status="online" />
                </div>
            </Demo>
        </Section>
    );
}

function AlertsSection(): Child {
    return (
        <Section id="alerts" title="Alerts" description="Four tones, three sizes, icons and dismissal.">
            <Demo label="Tones" wide>
                <div class="stack">
                    {ALERT_TONES.map((tone) => (
                        <Alert tone={tone} title={tone}>
                            A short message for this tone.
                        </Alert>
                    ))}
                </div>
            </Demo>
            <Demo label="Sizes">
                <div class="stack">
                    {SIZES.map((size) => (
                        <Alert size={size} tone="info" title={size}>
                            Sized alert
                        </Alert>
                    ))}
                </div>
            </Demo>
            <Demo label="Dismissible">
                <Alert tone="success" title="Saved" dismissible>
                    Click the close button to hide this alert.
                </Alert>
            </Demo>
        </Section>
    );
}

function ProgressSection(): Child {
    return (
        <Section id="progress" title="Progress & spinners" description="Determinate, indeterminate, tones and sizes.">
            <Demo label="Progress" wide>
                <div class="stack">
                    <Progress label="Small" size="small" value={30} showValue />
                    <Progress label="Success" value={55} tone="success" showValue />
                    <Progress label="Large warning" size="large" value={80} tone="warning" showValue />
                    <Progress label="Indeterminate" indeterminate />
                </div>
            </Demo>
            <Demo label="Spinners">
                <div class="row wrap">
                    <Spinner size="sm" label="Small" />
                    <Spinner label="Medium" />
                </div>
            </Demo>
        </Section>
    );
}

function TabsSection(): Child {
    const items = (): TabItem[] => [
        { id: "one", label: "One", content: () => <p class="muted">First panel.</p> },
        { id: "two", label: "Two", content: () => <p class="muted">Second panel.</p> },
        { id: "three", label: "Three", content: () => <p class="muted">Third panel.</p> },
    ];

    return (
        <Section id="tabs" title="Tabs" description="Line, pills and segmented styles, three sizes.">
            <Demo label="Line" wide>
                <Tabs items={items()} />
            </Demo>
            <Demo label="Pills">
                <Tabs items={items()} variant="pills" />
            </Demo>
            <Demo label="Segmented · small">
                <Tabs items={items()} variant="segmented" size="small" />
            </Demo>
        </Section>
    );
}

function MenusSection(): Child {
    const items: MenuItem[] = [
        { id: "copy", label: "Copy link", shortcut: "Ctrl C", onSelect: () => undefined },
        { id: "archive", label: "Archive", onSelect: () => undefined },
        { id: "remove", label: "Remove", danger: true, separatorBefore: true, onSelect: () => undefined },
    ];

    return (
        <Section id="menus" title="Menus" description="Sizes, trigger variants, alignment, shortcuts and separators.">
            <Demo label="Triggers" wide>
                <div class="row wrap">
                    <Menu label="Secondary" items={items} />
                    <Menu label="Primary" variant="primary" items={items} />
                    <Menu label="Ghost" variant="ghost" items={items} />
                    <Menu label="Small" size="small" align="end" items={items} />
                </div>
            </Demo>
            <Demo label="Danger and separators">
                <Menu label="Actions" items={items} />
            </Demo>
        </Section>
    );
}

function TablesSection(): Child {
    return (
        <Section id="tables" title="Tables" description="Sizes, striping, sorting, custom cells and empty states.">
            <Demo label="Sizes" wide>
                <div class="stack">
                    <Table<Person> size="small" columns={COLUMNS} rows={PEOPLE} striped />
                    <Table<Person> columns={COLUMNS} rows={PEOPLE} />
                </div>
            </Demo>
            <Demo label="Empty">
                <Table<Person> columns={COLUMNS} rows={[]} empty="Nothing here yet" />
            </Demo>
        </Section>
    );
}

function DialogsSection(): Child {
    const small = createSignal(false);
    const medium = createSignal(false);
    const large = createSignal(false);

    return (
        <Section id="dialogs" title="Dialogs" description="Three widths, footers, Escape, backdrop and focus restore.">
            <Demo label="Sizes" wide>
                <div class="row wrap">
                    <Button onClick={() => small.set(true)}>Small</Button>
                    <Button onClick={() => medium.set(true)}>Medium</Button>
                    <Button onClick={() => large.set(true)}>Large</Button>
                </div>
                <Dialog
                    open={small}
                    title="Small dialog"
                    size="small"
                    onClose={() => small.set(false)}
                    footer={<Button onClick={() => small.set(false)}>Close</Button>}
                >
                    Compact content for simple confirmations.
                </Dialog>
                <Dialog
                    open={medium}
                    title="Medium dialog"
                    size="medium"
                    onClose={() => medium.set(false)}
                    footer={<Button onClick={() => medium.set(false)}>Close</Button>}
                >
                    The default width, good for forms and short messages.
                </Dialog>
                <Dialog
                    open={large}
                    title="Large dialog"
                    size="large"
                    onClose={() => large.set(false)}
                    footer={
                        <>
                            <Button onClick={() => large.set(false)}>Cancel</Button>
                            <Button variant="primary" onClick={() => large.set(false)}>
                                Confirm
                            </Button>
                        </>
                    }
                >
                    A wider surface for detailed content, tables or previews.
                </Dialog>
            </Demo>
        </Section>
    );
}

function Gallery(): Child {
    const theme = createSignal<"light" | "dark">("light");

    createEffect(() => {
        document.documentElement.dataset["theme"] = theme();
    });

    return (
        <div class="gallery">
            <aside class="toc">
                <div class="toc__brand">
                    <strong>Kynetic UI</strong>
                    <span>14 categories</span>
                </div>
                <nav class="toc__nav">
                    {SECTIONS.map((section) => (
                        <a href={`#${section.id}`}>{section.title}</a>
                    ))}
                </nav>
                <Button
                    size="small"
                    variant="secondary"
                    onClick={() => theme.set(theme() === "light" ? "dark" : "light")}
                >
                    {() => (theme() === "light" ? "Dark mode" : "Light mode")}
                </Button>
            </aside>

            <main class="content">
                <header class="hero">
                    <Badge tone="info" dot>
                        @kyneticweb/ui
                    </Badge>
                    <h1>Component gallery</h1>
                    <p>
                        Fourteen categories, each with its full range of variants, tones, sizes and states. Every
                        component is parameterized: <code>size="small"</code>, <code>tone="success"</code>,{" "}
                        <code>variant="primary"</code>.
                    </p>
                </header>

                <ButtonsSection />
                <InputsSection />
                <SelectsSection />
                <ChoicesSection />
                <SwitchesSection />
                <SlidersSection />
                <BadgesSection />
                <AvatarsSection />
                <AlertsSection />
                <ProgressSection />
                <TabsSection />
                <MenusSection />
                <TablesSection />
                <DialogsSection />

                <footer class="footer">
                    <span>KyneticLibs · UI kit gallery</span>
                    <span>14 categories · 20 components</span>
                </footer>
            </main>
        </div>
    );
}

render(() => <Gallery />, document.getElementById("app")!);
