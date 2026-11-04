import { describe, expect, it } from "vitest";
import { createPending, jsx, type Child } from "@kyneticweb/dom";
import { renderToString, renderToStringAsync } from "../src/index.js";

/** Creates a component that is ready only after its pending work resolves. */
function deferred(label: string, delay = 0): () => Child {
    let ready = false;
    return () => {
        if (ready) {
            return jsx("span", null, label);
        }
        return createPending(
            new Promise<void>((resolve) => {
                setTimeout(() => {
                    ready = true;
                    resolve();
                }, delay);
            }),
            jsx("span", null, `loading ${label}`),
        );
    };
}

describe("renderToStringAsync", () => {
    it("renders the fallback synchronously", () => {
        const view = deferred("content");
        expect(renderToString(view)).toBe("<span>loading content</span>");
    });

    it("awaits pending work and renders the resolved tree", async () => {
        const view = deferred("content");
        expect(await renderToStringAsync(view)).toBe("<span>content</span>");
    });

    it("awaits several boundaries in the same pass", async () => {
        const first = deferred("a", 0);
        const second = deferred("b", 5);

        const html = await renderToStringAsync(() => jsx("div", null, first, second));

        expect(html).toBe("<div><span>a</span><span>b</span></div>");
    });

    it("respects the doctype option", async () => {
        expect(await renderToStringAsync(() => jsx("p", null, "x"), { doctype: true })).toBe("<!doctype html><p>x</p>");
    });

    it("throws when a pending node never settles", async () => {
        const stuck = () => createPending(Promise.resolve(), jsx("p", null, "waiting"));

        await expect(renderToStringAsync(stuck)).rejects.toThrow(/did not settle after 10 passes/);
    });
});
