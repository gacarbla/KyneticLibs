import { For, type Child } from "@kyneticweb/dom";
import { useI18n } from "../app.js";

/**
 * About page, downloaded with a dynamic import.
 *
 * @returns The page markup.
 */
export default function AboutPage(): Child {
    const i18n = useI18n();
    const facts = [i18n.t("about.fact1"), i18n.t("about.fact2"), i18n.t("about.fact3")];

    return (
        <section class="page">
            <h1>{i18n.t("about.title")}</h1>
            <p class="lead">{i18n.t("about.intro")}</p>
            <ul class="facts">
                <For each={facts}>{(fact) => <li>{fact}</li>}</For>
            </ul>
        </section>
    );
}
