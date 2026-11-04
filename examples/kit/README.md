# UI gallery

A dedicated page for the Kynetic UI kit: **14 categories**, each showing its full range of
variants, tones, sizes and states.

```bash
npm run dev:kit     # http://localhost:5173
npm run build:kit   # production build
```

## Categories

1. Buttons
2. Inputs
3. Selects
4. Checkboxes & radios
5. Switches
6. Sliders
7. Badges
8. Avatars
9. Alerts
10. Progress & spinners
11. Tabs
12. Menus
13. Tables
14. Dialogs

Every component is parameterized. Sizes accept `"small" | "medium" | "large"` (and the
short aliases `"sm" | "md" | "lg"`), tones are typed unions, and interactive controls take
accessors for reactive state.

```tsx
<Button size="small" variant="success">Save</Button>
<Select size="large" searchable items={countries} />
<Alert tone="warning" size="small" title="Careful" dismissible>…</Alert>
<Table size="medium" columns={columns} rows={people} striped />
```

## Implementation notes

- The page is built with the same public API the library ships; it is the best usage
  reference for the kit.
- JSX creates real DOM nodes, so reusable content is passed as a factory
  (`content: () => <Panel />`) when the same data feeds more than one component.
- The theme toggle writes `data-theme` on `<html>`, which switches the kit's CSS variables.
