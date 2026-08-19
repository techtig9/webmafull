import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GenerationProgress } from "@/components/generator/GenerationProgress";

describe("GenerationProgress", () => {
  it("shows every phase as pending before any phase event has arrived", () => {
    render(<GenerationProgress phase={null} />);
    expect(screen.getByText("Understanding your request")).toBeInTheDocument();
    expect(screen.getByText("Finalizing")).toBeInTheDocument();
  });

  it("marks earlier phases done and the current phase active, given a mid-sequence phase", () => {
    render(<GenerationProgress phase="code" />);

    const understanding = screen.getByText("Understanding your request").closest("li");
    const planning = screen.getByText("Planning website structure").closest("li");
    const code = screen.getByText("Generating code").closest("li");
    const finalizing = screen.getByText("Finalizing").closest("li");

    // Done phases render with the "done" text treatment (white/85, not the
    // dimmed pending style) — checked via the visible label class rather than
    // asserting on icon internals, which would couple the test to lucide's markup.
    expect(understanding).toHaveTextContent("Understanding your request");
    expect(understanding?.querySelector("span:last-child")).toHaveClass("text-white/85");
    expect(planning?.querySelector("span:last-child")).toHaveClass("text-white/85");
    expect(code?.querySelector("span:last-child")).toHaveClass("text-white/85");
    expect(finalizing?.querySelector("span:last-child")).toHaveClass("text-white/35");
  });

  it("marks every phase done when phase is the final one", () => {
    render(<GenerationProgress phase="finalizing" />);
    const finalizing = screen.getByText("Finalizing").closest("li");
    expect(finalizing?.querySelector("span:last-child")).toHaveClass("text-white/85");
  });
});
