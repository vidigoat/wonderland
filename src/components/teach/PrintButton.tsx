"use client";

export function PrintButton() {
  return (
    <button type="button" className="teach-print" onClick={() => window.print()}>
      Print this guide
    </button>
  );
}
