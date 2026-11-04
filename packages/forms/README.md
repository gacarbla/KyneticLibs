# `@kyneticweb/forms`

Typed form state, validation and accessible field bindings for the Kynetic runtime.

## Installation

```bash
npm install @kyneticweb/forms
```

## Usage

```tsx
import { createForm, Field } from "@kyneticweb/forms";

interface Signup {
    email: string;
    age: number;
}

const form = createForm<Signup>({
    initialValues: { email: "", age: 0 },
    validate: (values) => ({
        email: values.email.includes("@") ? undefined : "Invalid email",
        age: values.age >= 18 ? undefined : "Too young",
    }),
    onSubmit: async (values) => {
        await api.signup(values);
    },
});

function SignupForm() {
    return (
        <form onSubmit={form.handleSubmit}>
            <Field form={form} name="email" label="Email" type="email" />
            <Field form={form} name="age" label="Age" parse={Number} />
            <button type="submit" disabled={form.submitting()}>
                {form.submitting() ? "Sending…" : "Sign up"}
            </button>
            {form.formError() === null ? null : <p role="alert">{form.formError()}</p>}
        </form>
    );
}
```

## API

### `createForm(options)`

| Member | Description |
| --- | --- |
| `values` | Reactive values. |
| `errors` | Field errors, set on blur and submit. |
| `touched` | Fields blurred or submitted. |
| `submitting` | `true` while `onSubmit` runs. |
| `formError` | Error thrown by `onSubmit`. |
| `valid` | Live validation of the current values. |
| `field(name, options?)` | Binding with `inputProps`, `checkboxProps`, `value`, `error`, `invalid`, `set`, `touch`. |
| `setValue(name, value)` | Writes a value and clears that field's error. |
| `setError(name, message?)` | Sets or clears an error manually. |
| `reset(values?)` | Restores the initial values (or a patch) and clears state. |
| `submit()` | Validates, marks touched, calls `onSubmit`; prevents double submits. |
| `handleSubmit(event)` | `onSubmit` handler for `<form>`. |

### `<Field />`

Renders a label, a text-like input and an accessible error (`role="alert"`, `aria-invalid`,
`aria-describedby`). Pass `parse` to coerce values (`Number`, custom parsers) and `id` when two
forms share a field name.

## Notes

- Validation runs on `valid`, blur and submit; changing a value clears its error.
- `submit()` marks every field as touched and returns `false` without calling `onSubmit` when
  validation fails.
- Bindings return **thunks** for reactive values, so spreading `inputProps` onto an `<input>`
  works with the Kynetic compiler. Dynamic values written directly in a spread are eager; use
  the binding or an explicit thunk.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
