"use client";

export default function SentryTestPage() {
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Sentry verification</h1>
      <p>
        <button
          type="button"
          onClick={() => {
            throw new Error("webma Sentry test: client-side error");
          }}
        >
          Throw client error
        </button>
      </p>
      <p>
        <a href="/api/sentry-test">Trigger server error →</a>
      </p>
    </div>
  );
}
