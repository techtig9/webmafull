import { describe, it, expect } from "vitest";
import { ACTION_COSTS, PLAN_CREDITS, PLAN_PRICES, PLAN_FEATURES } from "@/lib/credits";

// These numbers came directly out of the product spec's credit-cost table. This
// test exists so a future edit can't silently change pricing (like the
// regenerate-vs-generate bug found and fixed during development) without a
// visible, deliberate test failure.
describe("credit cost table", () => {
  it("matches the spec exactly", () => {
    expect(ACTION_COSTS).toEqual({
      generate_full_website: 2500,
      generate_from_url: 3000,
      regenerate_complete: 750,
      generate_landing_page: 750,
      generate_new_page: 500,
      generate_new_section: 200,
      ai_edit: 350,
      change_theme: 100,
      voice_prompt: 50,
      generate_image: 600,
      export_code: 0,
      deploy_vercel: 0,
    });
  });

  it("regenerate is always cheaper than a fresh full generation", () => {
    expect(ACTION_COSTS.regenerate_complete).toBeLessThan(ACTION_COSTS.generate_full_website);
  });

  it("image generation costs more than a comparable single-call text edit, reflecting real per-image provider pricing", () => {
    expect(ACTION_COSTS.generate_image).toBeGreaterThan(ACTION_COSTS.ai_edit);
  });

  it("export and deploy are always free of credits", () => {
    expect(ACTION_COSTS.export_code).toBe(0);
    expect(ACTION_COSTS.deploy_vercel).toBe(0);
  });
});

describe("plan credit allowances", () => {
  it("matches the spec exactly", () => {
    expect(PLAN_CREDITS).toEqual({ free: 3_000, starter: 10_000, pro: 30_000, business: 75_000 });
  });

  it("strictly increases with plan tier", () => {
    expect(PLAN_CREDITS.free).toBeLessThan(PLAN_CREDITS.starter);
    expect(PLAN_CREDITS.starter).toBeLessThan(PLAN_CREDITS.pro);
    expect(PLAN_CREDITS.pro).toBeLessThan(PLAN_CREDITS.business);
  });
});

describe("plan prices", () => {
  it("strictly increases with plan tier", () => {
    expect(PLAN_PRICES.free).toBeLessThan(PLAN_PRICES.starter);
    expect(PLAN_PRICES.starter).toBeLessThan(PLAN_PRICES.pro);
    expect(PLAN_PRICES.pro).toBeLessThan(PLAN_PRICES.business);
  });
});

describe("plan feature matrix", () => {
  it("free plan can generate a website but not export, deploy, or add domains", () => {
    expect(PLAN_FEATURES.free.fullStackGeneration).toBe(true);
    expect(PLAN_FEATURES.free.zipExport).toBe(false);
    expect(PLAN_FEATURES.free.deployVercel).toBe(false);
    expect(PLAN_FEATURES.free.customDomains).toBe(0);
  });

  it("business plan is unlimited on domains and version history", () => {
    expect(PLAN_FEATURES.business.customDomains).toBe(-1);
    expect(PLAN_FEATURES.business.versionHistory).toBe(-1);
  });

  it("version history limits increase with plan tier", () => {
    expect(PLAN_FEATURES.starter.versionHistory).toBeLessThan(PLAN_FEATURES.pro.versionHistory);
  });
});
