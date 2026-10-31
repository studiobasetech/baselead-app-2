"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#050505", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>BaseLead hit an unexpected error</h1>
          <p style={{ color: "#9ca3af" }}>Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, background: "#3B82F6", color: "#fff", border: 0, borderRadius: 12, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
