import { describe, it, expect, vi } from "vitest";
import { consumeGenerationStream } from "@/lib/generation-stream";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i += 1;
      } else {
        controller.close();
      }
    },
  });
}

function sseFrame(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

describe("consumeGenerationStream", () => {
  it("calls onPhase for each phase event, in order, and resolves with the done payload", async () => {
    const events = [
      sseFrame({ phase: "understanding" }),
      sseFrame({ phase: "planning" }),
      sseFrame({ phase: "code" }),
      sseFrame({ type: "done", projectId: "p1", files: {}, sections: [], pages: [], cacheHit: false }),
    ].join("");

    const onPhase = vi.fn();
    const result = await consumeGenerationStream(streamFromChunks([events]), onPhase);

    expect(onPhase.mock.calls.map((c) => c[0])).toEqual(["understanding", "planning", "code"]);
    expect(result.projectId).toBe("p1");
  });

  it("handles an SSE frame split across two chunk boundaries", async () => {
    const full = sseFrame({ phase: "planning" }) + sseFrame({ type: "done", projectId: "p2", files: {}, sections: [], pages: [], cacheHit: true });
    // Split in the middle of the first frame's JSON, not on a clean frame boundary.
    const splitPoint = full.indexOf('"planning"') + 3;
    const onPhase = vi.fn();

    const result = await consumeGenerationStream(
      streamFromChunks([full.slice(0, splitPoint), full.slice(splitPoint)]),
      onPhase
    );

    expect(onPhase).toHaveBeenCalledWith("planning");
    expect(result.projectId).toBe("p2");
    expect(result.cacheHit).toBe(true);
  });

  it("rejects with the server's message on an error event", async () => {
    const events = sseFrame({ phase: "planning" }) + sseFrame({ type: "error", message: "Out of credits." });
    await expect(consumeGenerationStream(streamFromChunks([events]), vi.fn())).rejects.toThrow("Out of credits.");
  });

  it("rejects with a fallback message if the stream ends without a done or error event", async () => {
    const events = sseFrame({ phase: "understanding" });
    await expect(consumeGenerationStream(streamFromChunks([events]), vi.fn())).rejects.toThrow(/ended without a result/);
  });

  it("rejects immediately when the response has no body", async () => {
    await expect(consumeGenerationStream(null, vi.fn())).rejects.toThrow("No response stream to read.");
  });

  it("skips a malformed frame instead of throwing, and still reaches done", async () => {
    const events = "data: {not valid json\n\n" + sseFrame({ type: "done", projectId: "p3", files: {}, sections: [], pages: [], cacheHit: false });
    const result = await consumeGenerationStream(streamFromChunks([events]), vi.fn());
    expect(result.projectId).toBe("p3");
  });
});
