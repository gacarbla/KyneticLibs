import { createContext, createSignal, onMount, Show, useContext, type Child } from "@kyneticweb/dom";
import { Field, createForm } from "@kyneticweb/forms";
import type { I18n } from "@kyneticweb/i18n";
import { Link, RouterProvider, RouterView, type RoutePathMap, type Router } from "@kyneticweb/router";
import type { messages } from "./messages.js";

/** Routes shared by the server and the client. */
export const routes = {
    home: { path: "/", component: (): Child => <HomePage /> },
    about: { path: "/about", load: () => import("./pages/about.js") },
    contact: { path: "/contact", component: (): Child => <ContactPage /> },
} as const;

/** Router type inferred from the routes above. */
export type AppRouter = Router<RoutePathMap<typeof routes>, typeof routes>;

/** Translation manager with the keys declared in `messages.ts`. */
export type AppI18n = I18n<typeof messages>;

/** Values collected by the contact form. */
interface ContactValues {
    name: string;
    email: string;
    message: string;
}

const I18nContext = createContext<AppI18n | null>(null);

/**
 * Reads the active translations.
 *
 * @throws {Error} When called outside {@link createApp}.
 */
export function useI18n(): AppI18n {
    const i18n = useContext(I18nContext);
    if (i18n === null) {
        throw new Error("useI18n must be used inside createApp().");
    }
    return i18n;
}

/**
 * Builds the application tree.
 *
 * The server and the client call it with their own router and translations, so
 * no reactive state is shared between requests.
 */
export function createApp(router: AppRouter, i18n: AppI18n): Child {
    return (
        <I18nContext.Provider value={i18n}>
            <RouterProvider router={router}>
                <Shell />
            </RouterProvider>
        </I18nContext.Provider>
    );
}

/** Navigation frame shared by every route. */
function Shell(): Child {
    const i18n = useI18n();

    return (
        <div class="app">
            <header class="topbar">
                <Link to="home" class="brand">
                    Kynetic SSR
                </Link>
                <nav class="nav">
                    <Link to="home">{i18n.t("nav.home")}</Link>
                    <Link to="about">{i18n.t("nav.about")}</Link>
                    <Link to="contact">{i18n.t("nav.contact")}</Link>
                </nav>
                <LocalePicker />
            </header>
            <main class="content">
                <RouterView
                    fallback={<p class="muted">{i18n.t("notFound")}</p>}
                    loading={<p class="muted">{i18n.t("loading")}</p>}
                />
            </main>
            <footer class="footer">
                <span>KyneticLibs · SSR + hydration</span>
            </footer>
        </div>
    );
}

/** Buttons that change the locale reactively. */
function LocalePicker(): Child {
    const i18n = useI18n();

    return (
        <div class="locales" role="group" aria-label={i18n.t("locale.label")}>
            {i18n.languages.map((locale) => (
                <button
                    type="button"
                    class={i18n.locale() === locale ? "locale active" : "locale"}
                    onClick={() => i18n.setLocale(locale)}
                >
                    {locale.toUpperCase()}
                </button>
            ))}
        </div>
    );
}

/** Home page: a signal counter plus a hydration badge. */
function HomePage(): Child {
    const i18n = useI18n();
    const count = createSignal(0);
    const hydrated = createSignal(false);

    // Runs in the browser only: the server skips mount callbacks.
    onMount(() => hydrated.set(true));

    return (
        <section class="page">
            <h1>{i18n.t("home.title")}</h1>
            <p class="lead">{i18n.t("home.intro")}</p>

            <div class="card counter">
                <button type="button" class="ghost" onClick={() => count.update((value) => value - 1)}>
                    −
                </button>
                <output class="count">{() => i18n.formatNumber(count())}</output>
                <button type="button" onClick={() => count.update((value) => value + 1)}>
                    +
                </button>
            </div>
            <p class="muted">{i18n.t("home.counter")}</p>

            <p class={hydrated() ? "badge live" : "badge"}>
                {() => (hydrated() ? i18n.t("home.hydrated") : i18n.t("home.server"))}
            </p>
        </section>
    );
}

/** Contact page: a validated form with reactive fields. */
function ContactPage(): Child {
    const i18n = useI18n();
    const sent = createSignal(false);

    const form = createForm<ContactValues>({
        initialValues: { name: "", email: "", message: "" },
        validate: (values) => {
            const errors: Partial<Record<keyof ContactValues, string>> = {};
            if (values.name.trim().length < 2) {
                errors.name = i18n.t("form.nameError");
            }
            if (!values.email.includes("@")) {
                errors.email = i18n.t("form.emailError");
            }
            if (values.message.trim().length < 10) {
                errors.message = i18n.t("form.messageError");
            }
            return errors;
        },
        onSubmit: async () => {
            await new Promise((resolve) => setTimeout(resolve, 400));
            sent.set(true);
        },
    });

    return (
        <section class="page">
            <h1>{i18n.t("contact.title")}</h1>
            <p class="lead">{i18n.t("contact.intro")}</p>

            <Show
                when={sent}
                fallback={
                    <form class="card form" noValidate onSubmit={form.handleSubmit}>
                        <Field form={form} name="name" label={i18n.t("form.name")} />
                        <Field form={form} name="email" label={i18n.t("form.email")} type="email" />
                        <Field form={form} name="message" label={i18n.t("form.message")} />
                        {() =>
                            form.formError() === null ? null : (
                                <p class="form-error" role="alert">
                                    {form.formError()}
                                </p>
                            )
                        }
                        <button type="submit" class="primary" disabled={form.submitting()}>
                            {() => (form.submitting() ? i18n.t("form.sending") : i18n.t("form.send"))}
                        </button>
                    </form>
                }
            >
                <p class="success" role="status">
                    {i18n.t("form.sent")}
                </p>
            </Show>
        </section>
    );
}
