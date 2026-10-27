import Link from "next/link";

export default function WorldMissing() {
  return (
    <main className="missing">
      <p className="kicker">Wonderland</p>
      <h1>This world is not on the shelf.</h1>
      <p>The five bound worlds are still open.</p>
      <p className="missing-links">
        <Link href="/gallery">The shelf</Link>
        <Link href="/">Begin again</Link>
      </p>
    </main>
  );
}
