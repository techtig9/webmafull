import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { DescribeStep } from "@/components/generator/DescribeStep";

function renderStep(overrides: Partial<Parameters<typeof DescribeStep>[0]> = {}) {
  const props = { onSubmit: vi.fn(), onSubmitUrl: vi.fn(), submitting: false, ...overrides };
  render(
    <ToastProvider>
      <DescribeStep {...props} />
    </ToastProvider>
  );
  return props;
}

describe("DescribeStep — structured form", () => {
  it("submits the website name, description, and dropdown selections as real FollowUpAnswers fields", () => {
    const onSubmit = vi.fn();
    renderStep({ onSubmit });

    fireEvent.change(screen.getByPlaceholderText("e.g. Nova Agency"), { target: { value: "Nova Agency" } });
    fireEvent.change(screen.getByPlaceholderText(/Create a modern website/), { target: { value: "A digital agency." } });
    fireEvent.change(screen.getByLabelText(/website type/i), { target: { value: "Agency" } });
    fireEvent.change(screen.getByLabelText(/^style$/i), { target: { value: "Modern" } });
    fireEvent.change(screen.getByLabelText(/color preference/i), { target: { value: "Blue" } });

    fireEvent.click(screen.getByRole("button", { name: /generate website/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      "Nova Agency",
      "A digital agency.",
      { websiteType: "Agency", style: "Modern", colorPreference: "Blue" }
    );
  });

  it("folds the Pages selection into the description as a plain-language hint, not a separate field", () => {
    const onSubmit = vi.fn();
    renderStep({ onSubmit });

    fireEvent.change(screen.getByPlaceholderText("e.g. Nova Agency"), { target: { value: "Nova" } });
    fireEvent.change(screen.getByPlaceholderText(/Create a modern website/), { target: { value: "A bakery site." } });
    fireEvent.change(screen.getByLabelText(/pages/i), { target: { value: "5+" } });
    fireEvent.click(screen.getByRole("button", { name: /generate website/i }));

    const [, description] = onSubmit.mock.calls[0];
    expect(description).toContain("A bakery site.");
    expect(description).toContain("approximately 5+ pages");
  });

  it("hides the advanced options fields until the toggle is clicked", () => {
    renderStep();
    expect(screen.queryByPlaceholderText(/small business owners/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/advanced options/i));
    expect(screen.getByPlaceholderText(/small business owners/i)).toBeInTheDocument();
  });

  it("includes advanced options values in the submitted description once revealed and filled in", () => {
    const onSubmit = vi.fn();
    renderStep({ onSubmit });

    fireEvent.change(screen.getByPlaceholderText("e.g. Nova Agency"), { target: { value: "Nova" } });
    fireEvent.change(screen.getByPlaceholderText(/Create a modern website/), { target: { value: "A bakery site." } });
    fireEvent.click(screen.getByText(/advanced options/i));
    fireEvent.change(screen.getByPlaceholderText(/small business owners/i), { target: { value: "local families" } });
    fireEvent.change(screen.getByPlaceholderText(/Book a call/i), { target: { value: "Order online" } });
    fireEvent.click(screen.getByRole("button", { name: /generate website/i }));

    const [, description] = onSubmit.mock.calls[0];
    expect(description).toContain("Primary audience: local families.");
    expect(description).toContain("Main call to action: Order online.");
  });

  it("disables the generate button until both name and description are filled in", () => {
    renderStep();
    expect(screen.getByRole("button", { name: /generate website/i })).toBeDisabled();
  });

  it("still supports the existing Generate from URL mode, unaffected by the structured form addition", () => {
    const onSubmitUrl = vi.fn();
    renderStep({ onSubmitUrl });

    fireEvent.click(screen.getByText("Generate from URL"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Bloom & Co."), { target: { value: "Bloom" } });
    fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "https://bloom.example" } });
    // Both the mode tab and the submit button read "Generate from URL" once
    // this mode is active — the submit button is the one rendered later in
    // the DOM, after the form fields.
    const matches = screen.getAllByRole("button", { name: /generate from url/i });
    fireEvent.click(matches[matches.length - 1]);

    expect(onSubmitUrl).toHaveBeenCalledWith("Bloom", "https://bloom.example");
  });
});
