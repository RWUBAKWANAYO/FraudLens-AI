export function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

export function calculateProgress(
  currentIndex: number,
  totalBatches: number,
  startPercent: number,
  rangePercent: number
): number {
  return startPercent + Math.round(((currentIndex + 1) / totalBatches) * rangePercent);
}
