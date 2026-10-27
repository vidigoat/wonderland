import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WorldMissing() {
  return (
    <main className="missing">
      <Link href="/" className="bw-logo">
        <span className="bw-logo-mark" aria-hidden="true" />
        Wonderland
      </Link>
      <h1>This world isn&apos;t here.</h1>
      <p>It may not have been built yet, or the link is wrong. Every world that exists is on the worlds page.</p>
      <p className="missing-links">
        <Button asChild>
          <Link href="/gallery">See every world</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Ask a question</Link>
        </Button>
      </p>
    </main>
  );
}
