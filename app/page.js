import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", minHeight: "100vh", backgroundColor: "#f9f6f0", color: "#2b2b2b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ color: "#b8332a", fontSize: "2.8rem", marginBottom: "2rem" }}>omakase sushi</h1>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", maxWidth: "360px" }}>
        <li>
          <Link href="/generate-qr" style={{ display: "block", padding: "1.25rem", backgroundColor: "#b8332a", color: "#ffffff", borderRadius: "12px", textDecoration: "none", fontWeight: "bold", textAlign: "center" }}>📱 /generate-qr</Link>
        </li>
        <li>
          <Link href="/kitchen" style={{ display: "block", padding: "1.25rem", backgroundColor: "#2d4a3e", color: "#ffffff", borderRadius: "12px", textDecoration: "none", fontWeight: "bold", textAlign: "center" }}>👨‍🍳 /kitchen</Link>
        </li>
      </ul>
    </main>
  );
}
