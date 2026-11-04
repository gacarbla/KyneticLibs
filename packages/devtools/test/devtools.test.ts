// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { isDevtoolsEnabled, jsx, type Child } from "@kyneticweb/dom";
import { cleanup, render } from "@kyneticweb/testing";
import { createDevtools } from "../src/index.js";

afterEach(cleanup);

describe("createDevtools", () => {
    it("shows the component tree and reactive stats", () => {
        const devtools = createDevtools({ interval: 1000 });

        function ChildView(): Child {
            return jsx("span", null, "child");
        }
        function ParentView(): Child {
            return jsx("div", null, jsx(ChildView, null));
        }

        const app = render(() => jsx(ParentView, null));
        const shadow = devtools.element.shadowRoot;
        const text = shadow?.textContent ?? "";

        expect(text).toContain("ParentView");
        expect(text).toContain("ChildView");
        expect(text).toContain("Components");
        expect(shadow?.querySelector(".stats")?.textContent).toContain("signals");

        app.dispose();
        expect(shadow?.querySelector(".tree")?.textContent ?? "").not.toContain("ChildView");

        devtools.dispose();
        expect(document.body.contains(devtools.element)).toBe(false);
    });

    it("collapses and expands the panel", () => {
        const devtools = createDevtools({ interval: 1000 });
        const shadow = devtools.element.shadowRoot;
        const toggle = shadow?.querySelector(".toggle") as HTMLButtonElement;

        toggle.click();
        expect(shadow?.querySelector(".body")?.classList.contains("collapsed")).toBe(true);

        toggle.click();
        expect(shadow?.querySelector(".body")?.classList.contains("collapsed")).toBe(false);

        devtools.dispose();
    });

    it("installs the hook only while mounted", () => {
        const first = createDevtools({ interval: 1000 });
        expect(isDevtoolsEnabled()).toBe(true);

        first.dispose();
        expect(isDevtoolsEnabled()).toBe(false);

        const second = createDevtools({ interval: 1000 });
        second.dispose();
    });
});
