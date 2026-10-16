import Link from "next/link";

// Shown for paths outside any locale, where there is no [locale] layout
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#0b0f0d",
          color: "#eaeeeb",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "0 16px" }}>
          <h1 style={{ fontWeight: 500 }}>Page not found</h1>
          <Link href="/" style={{ color: "#62c793" }}>
            Eau de Fragrances
          </Link>
        </div>
      </body>
    </html>
  );
}
