import { describe, it, expect, vi } from "vitest";
import { humanizeSectionName, persistSectionOrder } from "@/lib/section-reorder";

describe("humanizeSectionName", () => {
  it("splits PascalCase component names into words", () => {
    expect(humanizeSectionName("FeatureGrid")).toBe("Feature grid");
  });

  it("capitalizes only the first word", () => {
    expect(humanizeSectionName("CallToAction")).toBe("Call to action");
  });

  it("leaves a single-word name capitalized", () => {
    expect(humanizeSectionName("Hero")).toBe("Hero");
  });

  it("handles names with digits without splitting the digit itself", () => {
    expect(humanizeSectionName("Section2Header")).toBe("Section2 header");
  });

  it("returns an empty string unchanged", () => {
    expect(humanizeSectionName("")).toBe("");
  });
});

describe("persistSectionOrder", () => {
  const projectId = "11111111-1111-4111-8111-111111111111";
  const previous = ["Hero", "Features", "Footer"];
  const next = ["Features", "Hero", "Footer"];

  it("applies the new order optimistically before the network call resolves", async () => {
    const onReorder = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    const promise = persistSectionOrder({ projectId, slug: "index", next, previous, onReorder, fetchImpl });
    expect(onReorder).toHaveBeenCalledWith(next);
    await promise;
  });

  it("sends the expected request body to the reorder-sections endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await persistSectionOrder({ projectId, slug: "about", next, previous, onReorder: vi.fn(), fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/projects/reorder-sections",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ projectId, slug: "about", orderedSections: next }),
      })
    );
  });

  it("does not call fetch at all when there is no projectId yet (unsaved project)", async () => {
    const onReorder = vi.fn();
    const fetchImpl = vi.fn();
    await persistSectionOrder({ projectId: null, slug: "index", next, previous, onReorder, fetchImpl });

    expect(onReorder).toHaveBeenCalledWith(next); // still updates the local preview
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rolls back to the previous order and reports an error on an HTTP failure", async () => {
    const onReorder = vi.fn();
    const onError = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "Page not found." }) });

    await persistSectionOrder({ projectId, slug: "index", next, previous, onReorder, onError, fetchImpl });

    expect(onReorder).toHaveBeenNthCalledWith(1, next); // optimistic
    expect(onReorder).toHaveBeenNthCalledWith(2, previous); // rollback
    expect(onError).toHaveBeenCalledWith("Page not found.");
  });

  it("rolls back and reports a generic error when the response body isn't JSON", async () => {
    const onReorder = vi.fn();
    const onError = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error("bad json"); } });

    await persistSectionOrder({ projectId, slug: "index", next, previous, onReorder, onError, fetchImpl });

    expect(onReorder).toHaveBeenNthCalledWith(2, previous);
    expect(onError).toHaveBeenCalledWith("Couldn't save the new order — reverted.");
  });

  it("rolls back and reports a network error when fetch itself throws", async () => {
    const onReorder = vi.fn();
    const onError = vi.fn();
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await persistSectionOrder({ projectId, slug: "index", next, previous, onReorder, onError, fetchImpl });

    expect(onReorder).toHaveBeenNthCalledWith(2, previous);
    expect(onError).toHaveBeenCalledWith("Network error — reorder reverted.");
  });

  it("reports saving state as true then false around a successful call", async () => {
    const onSaving = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    await persistSectionOrder({ projectId, slug: "index", next, previous, onReorder: vi.fn(), onSaving, fetchImpl });

    expect(onSaving).toHaveBeenNthCalledWith(1, true);
    expect(onSaving).toHaveBeenNthCalledWith(2, false);
  });
});
