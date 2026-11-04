import { describe, expect, it } from "vitest";
import { createContext, createPending, For, isServerMode, jsx, Show, useContext, type Child } from "@kyneticweb/dom";
import { renderToStream } from "../src/index.js";

/** Reads a whole stream as text. */
async function collect(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let html = "";
    for (;;) {
        const { value, done } = await reader.read();
        if (done === true) {
            break;
        }
        html += decoder.decode(value, { stream: true });
    }
    return html + decoder.decode();
}

describe("renderToStream", () => {
    it("emits the shell before a pending boundary resolves", async () => {
        let resolve!: () => void;
        const ready = new Promise<void>((done) => {
            resolve = done;
        });

        function View(): Child {
            return createPending(ready, jsx("p", null, "loading"), () => jsx("p", null, "content"));
        }

        const stream = renderToStream(() => jsx("div", null, jsx("header", null, "shell"), jsx(View, null)));
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        let head = "";
        while (!head.includes("</header>")) {
            const { value, done } = await reader.read();
            if (done === true) {
                break;
            }
            head += decoder.decode(value, { stream: true });
        }

        expect(head).toContain("<header>shell</header>");
        expect(head).not.toContain("content");

        resolve();
        let rest = "";
        for (;;) {
            const { value, done } = await reader.read();
            if (done === true) {
                break;
            }
            rest += decoder.decode(value, { stream: true });
        }
        rest += decoder.decode();

        expect(head + rest).toBe("<div><header>shell</header><p>content</p></div>");
    });

    it("keeps provider context and isolates concurrent streams", async () => {
        const Theme = createContext("light");
        function Panel(): Child {
            return jsx("p", null, useContext(Theme));
        }

        const render = (value: string): ReadableStream<Uint8Array> =>
            renderToStream(() => jsx(Theme.Provider, { value }, () => jsx(Panel, null)));

        const [dark, light] = await Promise.all([collect(render("dark")), collect(render("light"))]);

        expect(dark).toBe("<p>dark</p>");
        expect(light).toBe("<p>light</p>");
    });

    it("streams list and conditional markers", async () => {
        const h = jsx as unknown as (type: unknown, props: unknown, ...children: unknown[]) => Child;
        const html = await collect(
            renderToStream(() =>
                jsx(
                    "ul",
                    null,
                    h(For, { each: [1, 2] }, (item: number) => jsx("li", null, item)),
                    h(Show, { when: false, fallback: jsx("p", null, "empty") }, jsx("p", null, "visible")),
                ),
            ),
        );

        expect(html).toBe(
            "<ul><!--k:for--><li>1</li><li>2</li><!--/k:for--><!--k:when--><p>empty</p><!--/k:when--></ul>",
        );
    });

    it("supports the doctype option", async () => {
        expect(await collect(renderToStream(() => jsx("p", null, "x"), { doctype: true }))).toBe(
            "<!doctype html><p>x</p>",
        );
    });

    it("rejects pending nodes without a retry", async () => {
        const stream = renderToStream(() => createPending(Promise.resolve(), jsx("p", null, "waiting")));

        await expect(collect(stream)).rejects.toThrow(/retry/);
    });

    it("restores client mode after the stream ends", async () => {
        await collect(renderToStream(() => jsx("p", null, "x")));

        expect(isServerMode()).toBe(false);
    });
});
