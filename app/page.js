import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>omakase sushi</h1>
      <ul>
        <li>
          <Link href="/generate-qr">/generate-qr</Link>
        </li>
        <li>
          <Link href="/kitchen">/kitchen</Link>
        </li>
      </ul>
    </main>
  );
}
