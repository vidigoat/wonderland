/** Twelve days with the doors open. A run that stopped is not the same as a vault that merely lasted. */
export function runStopped(withdrawnShare: number): boolean {
  return withdrawnShare <= 0.02;
}

export function heldCaption(withdrawnShare: number): string {
  if (!runStopped(withdrawnShare)) {
    return `${Math.round(withdrawnShare * 100)}% took their money out. The doors stayed open.`;
  }
  return "Twelve days later, the bank is still open.";
}
