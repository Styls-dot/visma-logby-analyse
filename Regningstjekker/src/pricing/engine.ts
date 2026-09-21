export interface CachedPoint {
  yearlyConsumption: number;
  totalCost: number;
}

export interface CachedProduct {
  productId: string;
  company: string;
  product: string;
  points: CachedPoint[];
}

export function interpolateTotalCost(points: CachedPoint[], yearlyConsumption: number): number {
  if (points.length === 0) throw new Error("Kan ikke interpolere uden priskomponenter");
  const sorted = [...points].sort((a, b) => a.yearlyConsumption - b.yearlyConsumption);
  if (sorted.length === 1) return sorted[0]!.totalCost;

  // Find omkringliggende segment; ekstrapoler via nærmeste segment uden for range.
  let lo = sorted[0]!;
  let hi = sorted[1]!;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (yearlyConsumption >= a.yearlyConsumption && yearlyConsumption <= b.yearlyConsumption) {
      lo = a;
      hi = b;
      break;
    }
    if (yearlyConsumption > b.yearlyConsumption) {
      lo = sorted[sorted.length - 2]!;
      hi = sorted[sorted.length - 1]!;
    }
  }
  if (yearlyConsumption < sorted[0]!.yearlyConsumption) {
    lo = sorted[0]!;
    hi = sorted[1]!;
  }
  const span = hi.yearlyConsumption - lo.yearlyConsumption;
  if (span === 0) return lo.totalCost;
  const slope = (hi.totalCost - lo.totalCost) / span;
  return lo.totalCost + slope * (yearlyConsumption - lo.yearlyConsumption);
}

export function computeSavings(input: {
  current: CachedProduct;
  altid: CachedProduct;
  yearlyConsumption: number;
}): { currentTotalCost: number; altidTotalCost: number; savingsPerYear: number } {
  const currentTotalCost = interpolateTotalCost(input.current.points, input.yearlyConsumption);
  const altidTotalCost = interpolateTotalCost(input.altid.points, input.yearlyConsumption);
  return {
    currentTotalCost,
    altidTotalCost,
    savingsPerYear: currentTotalCost - altidTotalCost,
  };
}
