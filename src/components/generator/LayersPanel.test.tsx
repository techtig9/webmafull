import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LayersPanel } from "@/components/generator/LayersPanel";

const files = {
  "components/Hero.tsx": `export default function Hero() {
    return <section className="py-16 text-slate-900"><h1>Welcome</h1><button className="btn">Go</button></section>;
  }`,
  "components/Footer.tsx": `export default function Footer() {
    return <footer><p>© 2026</p></footer>;
  }`,
};

describe("LayersPanel", () => {
  it("renders a section group per section, each labeled with its humanized name", () => {
    render(<LayersPanel sections={["Hero", "Footer"]} files={files} onSelect={vi.fn()} />);
    expect(screen.getByText("Hero")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("renders the top-level parsed element for each section by default (shallow levels start expanded)", () => {
    render(<LayersPanel sections={["Hero"]} files={files} onSelect={vi.fn()} />);
    expect(screen.getByText("Welcome")).toBeInTheDocument();
  });

  it("calls onSelect with the element's real static className when a layer is clicked", () => {
    const onSelect = vi.fn();
    render(<LayersPanel sections={["Hero"]} files={files} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Welcome"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "h1", text: "Welcome", className: undefined, file: "components/Hero.tsx" })
    );
  });

  it("passes the section's exact file key, not just the section name", () => {
    const onSelect = vi.fn();
    render(<LayersPanel sections={["Footer"]} files={files} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("© 2026"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ file: "components/Footer.tsx" }));
  });

  it("shows an empty-page message when there are no sections", () => {
    render(<LayersPanel sections={[]} files={{}} onSelect={vi.fn()} />);
    expect(screen.getByText("No sections on this page yet.")).toBeInTheDocument();
  });

  it("shows a per-section error message instead of crashing when a file fails to parse", () => {
    const brokenFiles = { "components/Broken.tsx": "export default function Broken() { return <div" };
    render(<LayersPanel sections={["Broken"]} files={brokenFiles} onSelect={vi.fn()} />);
    expect(screen.getByText(/Couldn't parse this file/)).toBeInTheDocument();
  });
});
