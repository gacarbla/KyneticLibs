import { createEffect, hydrate } from "@kyneticweb/dom";
import { createI18n } from "@kyneticweb/i18n";
import { createPathStrategy, createRouter } from "@kyneticweb/router";
import { createApp, routes } from "./app.js";
import { messages } from "./messages.js";
import "./styles.css";

const i18n = createI18n({
    locale: "es",
    messages,
    fallbackLocale: "en",
    detect: true,
    persist: "kynetic:ssr:locale",
});

// Keep the document language in sync with the active locale.
createEffect(() => {
    document.documentElement.lang = i18n.locale();
});

// The router starts before hydration so `RouterView` can resolve the same route
// the server rendered and adopt its DOM instead of rebuilding it.
const router = createRouter({
    routes,
    strategy: createPathStrategy(),
    fallback: "home",
});
router.start();

const container = document.getElementById("app");

/** Hydrates the server markup. */
function mount(): void {
    if (container !== null) {
        hydrate(() => createApp(router, i18n), container);
    }
}

// Resolve the current lazy view before hydrating, so the first client render
// matches the server markup instead of showing the loading view.
void router.preload().then(mount, mount);
