import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { AIEditBar } from "@/components/generator/AIEditBar";

const baseProps = {
  projectId: "proj-1",
  activeFile: "components/Hero.tsx",
  files: { "components/Hero.tsx": "a\nb\nc" },
  onApplied: vi.fn(),
  onLockedAction: vi.fn(),
};

function renderBar(props: Partial<typeof baseProps> = {}) {
  return render(
    <ToastProvider>
      <AIEditBar {...baseProps} {...props} />
    </ToastProvider>
  );
}

describe("AIEditBar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders no chat history before any edit has been applied", () => {
    renderBar();
    expect(screen.queryByText("Revert")).not.toBeInTheDocument();
  });

  it("adds a turn to the chat history after a successful edit, with a Revert action on it", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: { "components/Hero.tsx": "a\nb\nc\nd" }, previousVersion: 3 }),
    }) as unknown as typeof fetch;

    renderBar();
    fireEvent.change(screen.getByPlaceholderText(/ask webma to edit/i), { target: { value: "Make it darker" } });
    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    await waitFor(() => expect(screen.getByText("Make it darker")).toBeInTheDocument());
    expect(screen.getByText(/Updated Hero — /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revert/i })).toBeInTheDocument();
  });

  it("clears the instruction input after a successful apply", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: { "components/Hero.tsx": "a\nb\nc\nd" }, previousVersion: 1 }),
    }) as unknown as typeof fetch;

    renderBar();
    const input = screen.getByPlaceholderText(/ask webma to edit/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Make it darker" } });
    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    await waitFor(() => expect(input.value).toBe(""));
  });

  it("calls onLockedAction instead of adding a turn when the edit is plan-gated", async () => {
    const onLockedAction = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ message: "Out of credits." }),
    }) as unknown as typeof fetch;

    renderBar({ onLockedAction });
    fireEvent.change(screen.getByPlaceholderText(/ask webma to edit/i), { target: { value: "Redo everything" } });
    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    await waitFor(() => expect(onLockedAction).toHaveBeenCalledWith("Out of credits."));
    expect(screen.queryByRole("button", { name: /revert/i })).not.toBeInTheDocument();
  });

  it("keeps Revert on only the most recent turn once a second edit lands", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ files: { f: "1" }, previousVersion: 1 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ files: { f: "2" }, previousVersion: 2 }) }) as unknown as typeof fetch;

    renderBar();
    const input = screen.getByPlaceholderText(/ask webma to edit/i);

    fireEvent.change(input, { target: { value: "First edit" } });
    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(screen.getByText("First edit")).toBeInTheDocument());

    fireEvent.change(input, { target: { value: "Second edit" } });
    fireEvent.click(screen.getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(screen.getByText("Second edit")).toBeInTheDocument());

    expect(screen.getAllByRole("button", { name: /revert/i })).toHaveLength(1);
  });
});
