/** Inverse-frequency class weights for imbalanced multi-class heads. */
export function computeClassWeights(labels: number[], numClasses: number): number[] {
  const counts = new Array(numClasses).fill(0);
  for (const label of labels) {
    if (label >= 0 && label < numClasses) counts[label] += 1;
  }
  const total = labels.length || 1;
  return counts.map((count) => (count > 0 ? total / (numClasses * count) : 1));
}