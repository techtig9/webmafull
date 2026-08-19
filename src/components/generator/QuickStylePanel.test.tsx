import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { QuickStylePanel } from "@/components/generator/QuickStylePanel";
import type { SelectedElement } from "@/components/generator/LivePreview";

const uniqueFiles = {
  "components/Hero.tsx": `function Hero() { return <h1 className="text-4xl text-slate-900">Hi</h1>; }`,
};

const ambiguousFiles = {
  "components/Cards.tsx": `function Cards() { return <>
    <div className="p-4 text-slate-900">A</div>
    <div className="p-4 text-slate-900">B</div>
  </>; }`,
};

const uniqueElement: SelectedElement = { tag: "h1", text: "Hi", file: "components/Hero.tsx", className: "text-4xl text-slate-900" };
const ambiguousElement: SelectedElement = { tag: "div", text: "A", file: "components/Cards.tsx", className: "p-4 text-slate-900" };

function renderPanel(overrides: Partial<Parameters<typeof QuickStylePanel>[0]> = {}) {
  const props = {
    projectId: "proj-1",
    files: uniqueFiles,
    selectedElement: uniqueElement,
    onDirectPatch: vi.fn(),
    onApplied: vi.fn(),
    onLockedAction: vi.fn(),
    ...overrides,
  };
  render(
    <ToastProvider>
      <QuickStylePanel {...props} />
    </ToastProvider>
  );
  return props;
}

describe("QuickStylePanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a disabled message when the selected element has no traced file", () => {
    renderPanel({ selectedElement: { tag: "div", text: "", file: null, className: "p-2" } });
    expect(screen.getByText(/can.t be quick-styled/i)).toBeInTheDocument();
  });

  it("patches the file directly and never calls fetch when the className is unique", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const onDirectPatch = vi.fn();

    renderPanel({ onDirectPatch });
    fireEvent.click(screen.getByLabelText("Set text color to Violet"));

    await waitFor(() => expect(onDirectPatch).toHaveBeenCalled());
    const [file, newSource] = onDirectPatch.mock.calls[0];
    expect(file).toBe("components/Hero.tsx");
    expect(newSource).toContain("text-violet-600");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to the AI edit endpoint when the className is ambiguous in its file", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: { "components/Cards.tsx": "updated" }, previousVersion: 2 }),
    }) as unknown as typeof fetch;
    const onDirectPatch = vi.fn();
    const onApplied = vi.fn();

    renderPanel({ files: ambiguousFiles, selectedElement: ambiguousElement, onDirectPatch, onApplied });
    fireEvent.click(screen.getByLabelText("Set text color to Violet"));

    await waitFor(() => expect(onApplied).toHaveBeenCalledWith({ "components/Cards.tsx": "updated" }));
    expect(onDirectPatch).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith("/api/ai/edit-section", expect.objectContaining({ method: "POST" }));
  });

  it("calls onLockedAction instead of applying when the AI fallback is plan-gated", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "Upgrade required." }),
    }) as unknown as typeof fetch;
    const onLockedAction = vi.fn();

    renderPanel({ files: ambiguousFiles, selectedElement: ambiguousElement, onLockedAction });
    fireEvent.click(screen.getByLabelText("Set background color to Blue"));

    await waitFor(() => expect(onLockedAction).toHaveBeenCalledWith("Upgrade required."));
  });

  it("patches a font-size change directly when the className is unique", async () => {
    const onDirectPatch = vi.fn();
    renderPanel({ onDirectPatch });
    fireEvent.click(screen.getByLabelText("Set font size to 4XL"));

    await waitFor(() => expect(onDirectPatch).toHaveBeenCalled());
    const [, newSource] = onDirectPatch.mock.calls[0];
    expect(newSource).toContain("text-4xl");
  });

  it("patches a padding change directly when the className is unique", async () => {
    const onDirectPatch = vi.fn();
    renderPanel({ onDirectPatch });
    fireEvent.click(screen.getByLabelText("Set padding to L"));

    await waitFor(() => expect(onDirectPatch).toHaveBeenCalled());
    const [, newSource] = onDirectPatch.mock.calls[0];
    expect(newSource).toContain("p-8");
  });

  it("disambiguates same-labeled options across different categories via distinct aria-labels", () => {
    renderPanel();
    expect(screen.getByLabelText("Set font size to L")).toBeInTheDocument();
    expect(screen.getByLabelText("Set padding to L")).toBeInTheDocument();
  });
});
