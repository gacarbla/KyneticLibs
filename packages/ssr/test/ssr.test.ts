import { describe, expect, it } from "vitest";
import { createContext, ErrorBoundary, For, jsx, Show, useContext, type Child } from "@kyneticweb/dom";
import { renderToString } from "../src/index.js";

describe("renderToString", () => {
    it("renders elements, attributes and text", () => {
        const html = renderToString(() => jsx("div", { class: "box", id: "app" }, jsx("span", null, "hello")));

        expect(html).toBe('<div class="box" id="app"><span>hello</span></div>');
    });

    it("escapes text and attributes", () => {
        const html = renderToString(() => jsx("p", { title: '"quoted" & <tag>' }, "<script>&"));

        expect(html).toBe('<p title="&quot;quoted&quot; &amp; &lt;tag&gt;">&lt;script&gt;&amp;</p>');
    });

    it("renders void elements without a closing tag", () => {
        expect(renderToString(() => jsx("img", { src: "/a.png", alt: "a" }))).toBe('<img src="/a.png" alt="a">');
    });

    it("renders class maps and style objects", () => {
        const html = renderToString(() =>
            jsx("div", { class: { active: true, hidden: false }, style: { backgroundColor: "red", zIndex: 2 } }),
        );

        expect(html).toBe('<div class="active" style="background-color:red;z-index:2"></div>');
    });

    it("renders components, children and dynamic thunks", () => {
        function Greeting(props: { name: string }): Child {
            return jsx("p", null, `Hello ${props.name}`);
        }
        function Wrapper(props: { children?: Child }): Child {
            return jsx("section", null, props.children);
        }

        const html = renderToString(() => jsx(Wrapper, null, jsx(Greeting, { name: "Gabe" }), () => "-dynamic"));

        expect(html).toBe("<section><p>Hello Gabe</p>-dynamic</section>");
    });

    it("renders keyed collections and conditionals", () => {
        // Manual jsx() calls cannot infer the generic parameters of For/Show;
        // TSX does it for us, so the test casts to concrete components.
        const List = For as unknown as (props: {
            each: number[];
            children: (item: number, index: number) => Child;
        }) => Child;
        const Conditional = Show as unknown as (props: { when: boolean; fallback?: Child; children?: Child }) => Child;
        // Manual jsx() calls cannot infer the generic parameters of For/Show;
        // TSX does it for us, so the test uses a loose factory for them.
        const h = jsx as unknown as (type: unknown, props: unknown, ...children: unknown[]) => Child;

        const html = renderToString(() =>
            jsx(
                "ul",
                null,
                h(List, { each: [1, 2, 3] }, (item: number) => jsx("li", null, item)),
                h(Conditional, { when: false, fallback: jsx("p", null, "empty") }, jsx("p", null, "visible")),
            ),
        );

        expect(html).toBe("<ul><li>1</li><li>2</li><li>3</li><p>empty</p></ul>");
    });

    it("renders context providers", () => {
        const Theme = createContext("light");

        function Panel(): Child {
            return jsx("p", null, useContext(Theme));
        }

        const html = renderToString(() => jsx(Theme.Provider, { value: "dark" }, () => jsx(Panel, null)));

        expect(html).toBe("<p>dark</p>");
    });

    it("catches errors with an error boundary", () => {
        function Boom(): Child {
            throw new Error("boom");
        }

        const html = renderToString(() =>
            jsx(ErrorBoundary, { fallback: (error: Error) => jsx("p", null, error.message) }, () => jsx(Boom, null)),
        );

        expect(html).toBe("<p>boom</p>");
    });

    it("supports an optional doctype", () => {
        expect(renderToString(() => jsx("div", null), { doctype: true })).toBe("<!doctype html><div></div>");
    });
});
