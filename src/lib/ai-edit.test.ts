import { describe, it, expect, vi } from "vitest";
import { applyEdit } from "@/lib/ai-edit";

const filesBefore = { "components/Hero.tsx": "a\nb\nc" };
const filesAfter = { "components/Hero.tsx": "a\nb\nc\nd" };

describe("applyEdit", () => {
  it("returns a success outcome with a computed diff summary and the revert version", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: filesAfter, previousVersion: 4 }),
    });

    const result = await applyEdit({
      projectId: "p1",
      targetFile: "components/Hero.tsx",
      instruction: "Make it darker",
      filesBefore,
      fetchImpl,
      generateId: () => "turn-1",
    });

    expect(result.outcome).toBe("success");
    if (result.outcome === "success") {
      expect(result.files).toEqual(filesAfter);
      expect(result.turn).toEqual({
        id: "turn-1",
        instruction: "Make it darker",
        revertVersion: 4,
        summary: expect.objectContaining({ headline: expect.stringContaining("1 line added") }),
      });
    }
  });

  it("sends the expected request body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: filesAfter, previousVersion: 1 }),
    });

    await applyEdit({ projectId: "p1", targetFile: "components/Hero.tsx", instruction: "Make it darker", filesBefore, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/ai/edit-section",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ projectId: "p1", targetFile: "components/Hero.tsx", instruction: "Make it darker" }),
      })
    );
  });

  it("classifies a 402 response as locked, not a generic error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ message: "Out of AI credits." }),
    });

    const result = await applyEdit({ projectId: "p1", targetFile: "f.tsx", instruction: "x", filesBefore, fetchImpl });
    expect(result).toEqual({ outcome: "locked", message: "Out of AI credits." });
  });

  it("classifies a 403 response as locked", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "Upgrade required." }),
    });

    const result = await applyEdit({ projectId: "p1", targetFile: "f.tsx", instruction: "x", filesBefore, fetchImpl });
    expect(result).toEqual({ outcome: "locked", message: "Upgrade required." });
  });

  it("classifies any other non-ok status as a generic error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Server exploded." }),
    });

    const result = await applyEdit({ projectId: "p1", targetFile: "f.tsx", instruction: "x", filesBefore, fetchImpl });
    expect(result).toEqual({ outcome: "error", message: "Server exploded." });
  });

  it("falls back to a generic error message when the error response has no body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("no body"); },
    });

    const result = await applyEdit({ projectId: "p1", targetFile: "f.tsx", instruction: "x", filesBefore, fetchImpl });
    expect(result).toEqual({ outcome: "error", message: "Edit failed — try again." });
  });

  it("treats a 200 response missing previousVersion as an error rather than an unrevertable success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: filesAfter }), // no previousVersion
    });

    const result = await applyEdit({ projectId: "p1", targetFile: "f.tsx", instruction: "x", filesBefore, fetchImpl });
    expect(result.outcome).toBe("error");
  });
});
