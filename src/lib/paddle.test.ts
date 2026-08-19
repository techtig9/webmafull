import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { verifyPaddleWebhook } from "@/lib/paddle";

function sign(body: string, secret: string, ts: string = Math.floor(Date.now() / 1000).toString()) {
  const h1 = crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

describe("verifyPaddleWebhook", () => {
  const secret = "test-webhook-secret";
  const body = JSON.stringify({ event_type: "subscription.created", data: { id: "sub_123" } });

  beforeEach(() => {
    process.env.PADDLE_WEBHOOK_SECRET = secret;
  });

  it("accepts a correctly signed payload", () => {
    const header = sign(body, secret);
    expect(verifyPaddleWebhook(body, header)).toBe(true);
  });

  it("rejects a missing signature header", () => {
    expect(verifyPaddleWebhook(body, null)).toBe(false);
  });

  it("rejects a tampered body (signature no longer matches)", () => {
    const header = sign(body, secret);
    const tamperedBody = JSON.stringify({ event_type: "subscription.created", data: { id: "sub_999" } });
    expect(verifyPaddleWebhook(tamperedBody, header)).toBe(false);
  });

  it("rejects a signature produced with the wrong secret", () => {
    const header = sign(body, "wrong-secret");
    expect(verifyPaddleWebhook(body, header)).toBe(false);
  });

  it("rejects a malformed header missing h1", () => {
    expect(verifyPaddleWebhook(body, "ts=1234567890")).toBe(false);
  });

  it("rejects a malformed header missing ts", () => {
    const h1 = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyPaddleWebhook(body, `h1=${h1}`)).toBe(false);
  });

  it("throws clearly if the webhook secret isn't configured", () => {
    delete process.env.PADDLE_WEBHOOK_SECRET;
    expect(() => verifyPaddleWebhook(body, sign(body, secret))).toThrow(/PADDLE_WEBHOOK_SECRET/);
  });
});
