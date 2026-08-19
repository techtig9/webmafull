import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { MfaSection } from "@/components/dashboard/MfaSection";

const listFactors = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      mfa: {
        listFactors: (...args: unknown[]) => listFactors(...args),
        enroll: vi.fn(),
        challenge: vi.fn(),
        verify: vi.fn(),
        unenroll: vi.fn(),
      },
    },
  }),
}));

function renderSection() {
  return render(
    <ToastProvider>
      <MfaSection />
    </ToastProvider>
  );
}

describe("MfaSection", () => {
  beforeEach(() => {
    listFactors.mockReset();
    listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
  });

  it("fetches MFA status exactly once on mount, not again on a subsequent re-render", async () => {
    // This is the specific regression the exhaustive-deps fix needed to
    // avoid: a naive fix (adding refreshStatus to the effect's dependency
    // array without first stabilizing the supabase client it closes over)
    // would make the effect refire on every render instead of running once
    // on mount as intended, since a fresh, non-memoized createClient()
    // call gives refreshStatus a new identity every time.
    const { rerender } = renderSection();
    await waitFor(() => expect(listFactors).toHaveBeenCalledTimes(1));

    rerender(
      <ToastProvider>
        <MfaSection />
      </ToastProvider>
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(listFactors).toHaveBeenCalledTimes(1);
  });

  it("shows the enable button when not enrolled", async () => {
    renderSection();
    await waitFor(() => expect(screen.getByRole("button", { name: /enable/i })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /disable/i })).not.toBeInTheDocument();
  });

  it("shows the disable button when a verified TOTP factor exists", async () => {
    listFactors.mockResolvedValue({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    });
    renderSection();
    await waitFor(() => expect(screen.getByRole("button", { name: /disable/i })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /^enable$/i })).not.toBeInTheDocument();
  });

  it("does not crash and shows neither button while status is still loading", () => {
    listFactors.mockReturnValue(new Promise(() => {})); // never resolves
    renderSection();
    expect(screen.queryByRole("button", { name: /enable/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /disable/i })).not.toBeInTheDocument();
  });
});
