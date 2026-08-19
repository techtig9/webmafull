import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiKeysCard } from "@/components/dashboard/ApiKeysCard";

function renderCard() {
  return render(
    <ToastProvider>
      <ApiKeysCard />
    </ToastProvider>
  );
}

describe("ApiKeysCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an empty state when there are no keys yet", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ keys: [] }) }) as unknown as typeof fetch;
    renderCard();
    await waitFor(() => expect(screen.getByText("No API keys yet.")).toBeInTheDocument());
  });

  it("lists existing keys by name and prefix, never showing a raw key value for them", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        keys: [{ id: "k1", name: "CI pipeline", key_prefix: "wm_live_abcd", last_used_at: null, created_at: "2026-01-01" }],
      }),
    }) as unknown as typeof fetch;
    renderCard();
    await waitFor(() => expect(screen.getByText("CI pipeline")).toBeInTheDocument());
    expect(screen.getByText(/wm_live_abcd/)).toBeInTheDocument();
    expect(screen.getByText(/never used/)).toBeInTheDocument();
  });

  it("shows the raw key exactly once immediately after creation", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [] }) }) // initial list
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ key: { id: "k2", name: "New key", key_prefix: "wm_live_xyz9", rawKey: "wm_live_xyz9secretvalue" } }),
      }); // create
    global.fetch = global.fetch as unknown as typeof fetch;

    renderCard();
    await waitFor(() => expect(screen.getByText("No API keys yet.")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/key name/i), { target: { value: "New key" } });
    fireEvent.click(screen.getByRole("button", { name: /create key/i }));

    await waitFor(() => expect(screen.getByText("wm_live_xyz9secretvalue")).toBeInTheDocument());
    expect(screen.getByText(/copy this now/i)).toBeInTheDocument();
  });

  it("dismisses the reveal-once panel and does not bring the raw key back", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ key: { id: "k3", name: "Temp", key_prefix: "wm_live_temp", rawKey: "wm_live_tempsecretvalue" } }),
      });
    global.fetch = global.fetch as unknown as typeof fetch;

    renderCard();
    await waitFor(() => expect(screen.getByText("No API keys yet.")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/key name/i), { target: { value: "Temp" } });
    fireEvent.click(screen.getByRole("button", { name: /create key/i }));
    await waitFor(() => expect(screen.getByText("wm_live_tempsecretvalue")).toBeInTheDocument());

    fireEvent.click(screen.getByText(/i've saved it/i));
    expect(screen.queryByText("wm_live_tempsecretvalue")).not.toBeInTheDocument();
    // ...but the key still shows up in the list below, by prefix only.
    expect(screen.getByText("Temp")).toBeInTheDocument();
    expect(screen.getByText(/wm_live_temp/)).toBeInTheDocument();
  });

  it("removes a revoked key from the list", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [{ id: "k4", name: "Old key", key_prefix: "wm_live_old1", last_used_at: null, created_at: "2026-01-01" }] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) }); // revoke
    global.fetch = global.fetch as unknown as typeof fetch;

    renderCard();
    await waitFor(() => expect(screen.getByText("Old key")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /revoke old key/i }));
    await waitFor(() => expect(screen.queryByText("Old key")).not.toBeInTheDocument());
  });

  it("does not submit an empty key name", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ keys: [] }) }) as unknown as typeof fetch;
    renderCard();
    await waitFor(() => expect(screen.getByText("No API keys yet.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^create key$/i })).toBeDisabled();
  });
});
