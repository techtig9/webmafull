import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { SectionReorder } from "@/components/generator/SectionReorder";

function renderPanel(sections: string[], projectId: string | null = "proj-1") {
  return render(
    <ToastProvider>
      <SectionReorder projectId={projectId} slug="index" sections={sections} onReorder={() => {}} />
    </ToastProvider>
  );
}

describe("SectionReorder", () => {
  it("renders one row per section, in the given order, with humanized labels", () => {
    renderPanel(["Hero", "FeatureGrid", "Footer"]);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Hero");
    expect(rows[1]).toHaveTextContent("Feature grid");
    expect(rows[2]).toHaveTextContent("Footer");
  });

  it("gives every drag handle an accessible, section-specific label", () => {
    renderPanel(["Hero", "Footer"]);

    expect(screen.getByLabelText("Drag to reorder Hero")).toBeInTheDocument();
    expect(screen.getByLabelText("Drag to reorder Footer")).toBeInTheDocument();
  });

  it("shows an empty state instead of the panel chrome when there are no sections", () => {
    renderPanel([]);

    expect(screen.getByText("No sections on this page yet.")).toBeInTheDocument();
    expect(screen.queryByText("Layout order")).not.toBeInTheDocument();
  });

  it("does not show a saving indicator before any reorder has happened", () => {
    renderPanel(["Hero", "Footer"]);
    expect(screen.queryByText("Saving…")).not.toBeInTheDocument();
  });
});
