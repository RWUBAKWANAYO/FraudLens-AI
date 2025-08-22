import { IsolationForest } from "isolation-forest";

export function isoForestScores(amounts: number[]) {
  if (amounts.length < 25) return [] as number[];
  const iso = new IsolationForest();
  const X = amounts.map((a) => ({ amount: a }));
  iso.fit(X);
  return iso.scores();
}
