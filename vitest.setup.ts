import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// The rest of this test suite explicitly imports { describe, it, expect } from
// vitest per-file rather than relying on injected globals (vitest.config.ts
// doesn't set test.globals), so @testing-library/react's usual auto-cleanup —
// which detects a global afterEach — never fires. Without this, one test's
// rendered DOM (and its dnd-kit-generated ids) leaks into the next test in the
// same file and produces "found multiple elements" failures that have nothing
// to do with the component under test.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement ResizeObserver, but @dnd-kit's sensors touch it on
// mount to track draggable element sizing. A no-op stub is enough for
// component tests that render a sortable list without simulating real drag
// pointer movement (drag physics are covered by Playwright E2E instead, where
// a real browser lays out real elements).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom also doesn't implement Element.scrollTo (every real browser does) —
// AIEditBar's chat history calls it to auto-scroll to the latest turn.
if (typeof Element.prototype.scrollTo === "undefined") {
  Element.prototype.scrollTo = function scrollToStub() {};
}

// Suppresses exactly one known, traced Node.js deprecation warning
// (DEP0040, the built-in `punycode` module) that has appeared on every test
// run this whole project — never a real functional issue, but real console
// noise. Deliberately NOT a blanket --no-deprecation flag, which would also
// hide any different, genuinely new deprecation warning introduced later —
// this only matches the exact known message.
//
// Traced to its actual root, not guessed: two independent transitive
// sources, both confirmed via `npm view <pkg> dependencies`.
//   1. openai@4.x (used in gemini.ts as a generic OpenAI-compatible client
//      for Groq/Cerebras/OpenRouter, not for calling OpenAI itself) depends
//      on node-fetch@2.x -> whatwg-url@5.0.0 -> tr46@0.0.3, which calls the
//      deprecated bare require("punycode"). openai@5+ drops node-fetch
//      entirely (confirmed empty dependency list) and would fix this half —
//      but that's a 3-major-version jump with no way to verify nothing
//      broke in live AI generation from this sandbox, for a cosmetic
//      warning. Not a responsible trade.
//   2. @supabase/supabase-js bundles its own @supabase/node-fetch fallback,
//      which independently depends on whatwg-url@^5.0.0 — confirmed present
//      even in the latest stable 2.x release (2.112.3; no stable 3.x exists
//      upstream yet). This source can't be fixed by any version bump
//      available today, which means fixing source 1 alone would not even
//      make the warning go away — a second, real reason not to take on that
//      risk for zero observed benefit.
// Revisit this suppression once @supabase/supabase-js ships a stable
// release that's moved off the old node-fetch/whatwg-url chain.
//
// Implementation note: process.on("warning", ...) does NOT work for this —
// verified by testing it directly, not assumed. It only adds an additional
// listener; Node's own default stderr printer is a separate, built-in
// listener that keeps firing regardless of what a user listener does. The
// only reliable way to actually suppress one specific warning by message is
// to intercept process.emitWarning itself, before Node's default printer
// ever sees it.
const KNOWN_UNFIXABLE_WARNING = /The `punycode` module is deprecated/;
const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const message = typeof warning === "string" ? warning : warning.message;
  if (KNOWN_UNFIXABLE_WARNING.test(message)) return;
  return (originalEmitWarning as (...args: unknown[]) => void)(warning, ...rest);
}) as typeof process.emitWarning;
