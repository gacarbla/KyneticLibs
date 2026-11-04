# `@kyneticweb/ui`

Accessible, themeable components for the Kynetic runtime. Every component renders to the
universal tree, so it works in the browser and on the server, and it hydrates in place.

## Installation

```bash
npm install @kyneticweb/ui
```

Import the stylesheet once in your entry:

```ts
import "@kyneticweb/ui/styles.css";
```

## Usage

```tsx
import { Badge, Button, Card, Dialog, Switch, Tabs } from "@kyneticweb/ui";
import { createSignal } from "@kyneticweb/dom";

function Settings() {
    const notifications = createSignal(true);
    const open = createSignal(false);

    return (
        <Card title="Settings" actions={<Badge tone="success">Saved</Badge>}>
            <Switch checked={notifications} onChange={notifications.set} label="Notifications" />
            <Button variant="primary" onClick={() => open.set(true)}>
                Delete account
            </Button>
            <Dialog
                open={open}
                title="Delete account"
                onClose={() => open.set(false)}
                footer={<Button variant="danger">Delete</Button>}
            >
                This action cannot be undone.
            </Dialog>
        </Card>
    );
}
```

## Components

| Component | Notes |
| --- | --- |
| `Button` | Variants `primary`, `secondary`, `ghost`, `danger`, `success`, `warning`, `info`, `link`; sizes `sm`, `md`, `lg`; `loading`, `disabled`, `block`. |
| `Badge` | Tones `neutral`, `info`, `success`, `warning`, `danger`. |
| `Card` | Optional `title` and `actions` header, plus body content. |
| `Spinner` | `role="status"` with an accessible `label`. |
| `Switch` | Native checkbox wrapped by its label; `checked` accepts an accessor. |
| `Input` | Any native `type` (email, password, number, date, search…), `label`, `hint`, `error`, sizes, controlled or uncontrolled. |
| `Textarea` | Multi-line input with label, hint, error and rows. |
| `Checkbox` | Native checkbox with `indeterminate` support. |
| `RadioGroup` | Native radios sharing a `name`, with label and error. |
| `Select` | Optional search, groups/categories, clear button, keyboard navigation and fixed-position panel. |
| `Menu` | Dropdown with icons, shortcuts, separators, danger items and arrow-key navigation. |
| `Table` | Columns, custom cells, striping, compact mode, empty state, row clicks and client-side sorting. |
| `Tabs` | ARIA tabs with arrow-key navigation; controlled (`value`) or uncontrolled. |
| `Dialog` | Modal with Escape, backdrop click, focus in/out and `aria-modal`. |

## Selects and menus

```tsx
<Select
    label="Country"
    searchable
    clearable
    items={[
        {
            label: "Europe",
            options: [
                { value: "es", label: "Spain" },
                { value: "fr", label: "France", description: "French Republic" },
            ],
        },
        {
            label: "America",
            options: [{ value: "mx", label: "Mexico" }],
        },
    ]}
    value={country}
    onChange={country.set}
/>

<Menu
    label="Actions"
    items={[
        { id: "copy", label: "Copy link", shortcut: "Ctrl C", onSelect: copy },
        { id: "remove", label: "Remove", danger: true, separatorBefore: true, onSelect: remove },
    ]}
/>
```

## Inputs and tables

```tsx
<Input label="Email" type="email" value={email} error={invalidEmail} />
<Textarea label="Message" rows={4} value={message} />
<Checkbox checked={accepted} onChange={accepted.set} label="Accept the terms" />
<RadioGroup name="plan" label="Plan" value={plan} onChange={plan.set} options={plans} />

<Table
    columns={[
        { key: "name", header: "Name", sortable: true },
        { key: "role", header: "Role", align: "end" },
    ]}
    rows={people}
    striped
/>
```

## Reactivity

Component attributes are eager, so pass an **accessor** for props that must update:

```tsx
<Button disabled={() => saving()}>Save</Button>
<Switch checked={enabled} onChange={enabled.set} label="Enabled" />
<Dialog open={open} title="Edit" onClose={() => open.set(false)}>…</Dialog>
```

Plain values work too; they just do not update when the source changes.

## Content is made of real nodes

JSX produces real DOM nodes, not reusable templates. When the same content is rendered in
several places (for example one `items` array passed to two `Tabs`), pass a **factory** so
each mount creates its own nodes:

```tsx
const items = (): TabItem[] => [
    { id: "one", label: "One", content: () => <Overview /> },
    { id: "two", label: "Two", content: () => <Billing /> },
];

<Tabs items={items()} />
<Tabs items={items()} variant="pills" />
```

## Theming

The stylesheet defines CSS variables on `:root` and a dark palette under
`[data-theme="dark"]`:

```css
:root {
    --kyn-accent: #3d7dfb;
    --kyn-surface: #ffffff;
    --kyn-text: #182036;
    /* … */
}
```

Override them in your own stylesheet to match a brand:

```css
:root {
    --kyn-accent: #b4552d;
    --kyn-radius: 6px;
}
```

## Server rendering

Components use only declarative bindings, so `renderToString`, `renderToStringAsync` and
`renderToStream` serialize them without a DOM. `Dialog` renders nothing while closed and its
markup inline while open; `Select` and `Menu` render their trigger and open their panels on
the client only. `Textarea` values are serialized as element content, not as an attribute.
Client effects (Escape, focus, placement) are skipped on the server and resume after
hydration.

## Accessibility notes

- `Button` keeps `type="button"` unless you pass another type.
- `Switch` uses a real checkbox inside a `<label>`, so it is keyboard and screen-reader
  friendly without generated ids.
- `Tabs` wires `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`,
  `aria-controls` and roving `tabindex`.
- `Dialog` moves focus inside, restores it on close and closes on Escape. A full focus trap
  is not implemented yet.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
