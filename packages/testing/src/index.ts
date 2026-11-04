/**
 * `@kyneticweb/testing`
 *
 * DOM testing helpers for the Kynetic runtime: mount a component, query by
 * text or selector, dispatch user events and wait for reactive updates.
 */

export { cleanup, render } from "./render.js";
export { fireEvent } from "./events.js";
export { flush } from "./flush.js";
export { waitFor } from "./wait.js";
export type { RenderOptions, Target, TestApp, TestComponent, TextMatcher, WaitForOptions } from "./types.js";
