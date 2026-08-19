import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { AiImagePanel } from "@/components/generator/AiImagePanel";
import type { SelectedElement } from "@/components/generator/LivePreview";

const files = { "components/Hero.tsx": `function Hero() { return <img src="/old.png" alt="Hero" />; }` };
const imgElement: SelectedElement = { tag: "img", text: "", file: "components/Hero.tsx", src: "/old.png" };

function renderPanel(overrides: Partial<Parameters<typeof AiImagePanel>[0]> = {}) {
  const props = {
    projectId: "proj-1",
    files,
    selectedElement: imgElement,
    onDirectPatch: vi.fn(),
    onApplied: vi.fn(),
    onLockedAction: vi.fn(),
    ...overrides,
  };
  render(
    <ToastProvider>
      <AiImagePanel {...props} />
    </ToastProvider>
  );
  return props;
}

describe("AiImagePanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when the selected element isn't an img", () => {
    const { container } = render(
      <ToastProvider>
        <AiImagePanel
          projectId="p1"
          files={files}
          selectedElement={{ tag: "h1", text: "Hi", file: "components/Hero.tsx" }}
          onDirectPatch={vi.fn()}
          onApplied={vi.fn()}
          onLockedAction={vi.fn()}
        />
      </ToastProvider>
    );
    expect(container.textContent).toBe("");
  });

  it("renders nothing when the img has no traced file", () => {
    const { container } = render(
      <ToastProvider>
        <AiImagePanel
          projectId="p1"
          files={files}
          selectedElement={{ tag: "img", text: "", file: null }}
          onDirectPatch={vi.fn()}
          onApplied={vi.fn()}
          onLockedAction={vi.fn()}
        />
      </ToastProvider>
    );
    expect(container.textContent).toBe("");
  });

  it("generates an image and directly patches the src when it's unique in the file", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://cdn.example.com/new.png" }),
    }) as unknown as typeof fetch;
    const onDirectPatch = vi.fn();

    renderPanel({ onDirectPatch });
    fireEvent.change(screen.getByPlaceholderText(/describe the image/i), { target: { value: "a mountain sunrise" } });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => expect(onDirectPatch).toHaveBeenCalled());
    const [file, newSource] = onDirectPatch.mock.calls[0];
    expect(file).toBe("components/Hero.tsx");
    expect(newSource).toContain("https://cdn.example.com/new.png");
    expect(newSource).not.toContain("/old.png");
  });

  it("sends the prompt and projectId to the generate-image endpoint", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ url: "https://x/new.png" }) });
    global.fetch = fetchSpy as unknown as typeof fetch;

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText(/describe the image/i), { target: { value: "a mountain sunrise" } });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/ai/generate-image",
        expect.objectContaining({ body: JSON.stringify({ prompt: "a mountain sunrise", projectId: "proj-1" }) })
      )
    );
  });

  it("calls onLockedAction when image generation is plan-gated", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ message: "Upgrade to generate images." }),
    }) as unknown as typeof fetch;
    const onLockedAction = vi.fn();

    renderPanel({ onLockedAction });
    fireEvent.change(screen.getByPlaceholderText(/describe the image/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => expect(onLockedAction).toHaveBeenCalledWith("Upgrade to generate images."));
  });

  it("falls back to an AI edit when the current src isn't unique in the file", async () => {
    const ambiguousFiles = {
      "components/Gallery.tsx": `function Gallery() { return <><img src="/shared.png" /><img src="/shared.png" /></>; }`,
    };
    const ambiguousElement: SelectedElement = { tag: "img", text: "", file: "components/Gallery.tsx", src: "/shared.png" };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ url: "https://x/new.png" }) }) // generate-image
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ files: { "components/Gallery.tsx": "swapped" }, previousVersion: 1 }) }); // AI edit fallback
    global.fetch = global.fetch as unknown as typeof fetch;

    const onApplied = vi.fn();
    const onDirectPatch = vi.fn();
    renderPanel({ files: ambiguousFiles, selectedElement: ambiguousElement, onApplied, onDirectPatch });

    fireEvent.change(screen.getByPlaceholderText(/describe the image/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => expect(onApplied).toHaveBeenCalledWith({ "components/Gallery.tsx": "swapped" }));
    expect(onDirectPatch).not.toHaveBeenCalled();
  });
});
