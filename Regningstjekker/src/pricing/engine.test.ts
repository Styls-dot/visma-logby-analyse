import { describe, it, expect } from "vitest";
import { interpolateTotalCost, computeSavings, type CachedProduct } from "./engine.js";

describe("interpolateTotalCost", () => {
  const points = [
    { yearlyConsumption: 2000, totalCost: 1000 },
    { yearlyConsumption: 4000, totalCost: 1400 },
  ];

  it("interpolerer mellem to punkter", () => {
    expect(interpolateTotalCost(points, 3000)).toBeCloseTo(1200, 6);
  });

  it("rammer et eksakt punkt", () => {
    expect(interpolateTotalCost(points, 4000)).toBeCloseTo(1400, 6);
  });

  it("ekstrapolerer under laveste punkt via de to nærmeste", () => {
    // linje gennem (2000, 1000) og (4000, 1400): slope = 0.2 -> ved 1000 kWh = 800
    expect(interpolateTotalCost(points, 1000)).toBeCloseTo(800, 6);
  });

  it("ekstrapolerer over højeste punkt", () => {
    // ved 6000 kWh = 1400 + 0.2*(6000-4000) = 1800
    expect(interpolateTotalCost(points, 6000)).toBeCloseTo(1800, 6);
  });

  it("håndterer et enkelt punkt (konstant)", () => {
    expect(interpolateTotalCost([{ yearlyConsumption: 4000, totalCost: 900 }], 8000)).toBe(900);
  });

  it("kaster ved tomt punktsæt", () => {
    expect(() => interpolateTotalCost([], 4000)).toThrow();
  });

  describe("multi-punkt arrays (3+ punkter)", () => {
    const threePoints = [
      { yearlyConsumption: 2000, totalCost: 1000 },
      { yearlyConsumption: 4000, totalCost: 1400 },
      { yearlyConsumption: 8000, totalCost: 2000 },
    ];

    it("interpolerer i 2. segment (6000 mellem 4000-8000)", () => {
      // slope = (2000 - 1400) / (8000 - 4000) = 600 / 4000 = 0.15
      // cost = 1400 + 0.15 * (6000 - 4000) = 1400 + 300 = 1700
      expect(interpolateTotalCost(threePoints, 6000)).toBeCloseTo(1700, 6);
    });

    it("interpolerer i 1. segment (3000 mellem 2000-4000)", () => {
      // slope = (1400 - 1000) / (4000 - 2000) = 0.2
      // cost = 1000 + 0.2 * (3000 - 2000) = 1200
      expect(interpolateTotalCost(threePoints, 3000)).toBeCloseTo(1200, 6);
    });

    it("ekstrapolerer under (1000 < 2000) via 1. segment", () => {
      // slope = 0.2, cost = 1000 + 0.2 * (1000 - 2000) = 800
      expect(interpolateTotalCost(threePoints, 1000)).toBeCloseTo(800, 6);
    });

    it("ekstrapolerer over (10000 > 8000) via sidste segment", () => {
      // slope = 0.15, cost = 2000 + 0.15 * (10000 - 8000) = 2300
      expect(interpolateTotalCost(threePoints, 10000)).toBeCloseTo(2300, 6);
    });

    it("sorterer usorteret input internt", () => {
      const unsorted = [
        { yearlyConsumption: 4000, totalCost: 1400 },
        { yearlyConsumption: 2000, totalCost: 1000 },
      ];
      // Skal sorteres til [(2000, 1000), (4000, 1400)] og give 1200
      expect(interpolateTotalCost(unsorted, 3000)).toBeCloseTo(1200, 6);
    });
  });
});

describe("computeSavings", () => {
  const current: CachedProduct = {
    productId: "konkurrent_x",
    company: "Konkurrent",
    product: "Standard",
    points: [
      { yearlyConsumption: 2000, totalCost: 1200 },
      { yearlyConsumption: 4000, totalCost: 1600 },
    ],
  };
  const altid: CachedProduct = {
    productId: "altid_indkob_18",
    company: "Altid Energi",
    product: "Strøm til indkøbspris - 18 kr/md",
    points: [
      { yearlyConsumption: 2000, totalCost: 172.8 },
      { yearlyConsumption: 4000, totalCost: 172.8 },
    ],
  };

  it("beregner positiv besparelse ved skift til Altid", () => {
    const r = computeSavings({ current, altid, yearlyConsumption: 4000 });
    expect(r.currentTotalCost).toBeCloseTo(1600, 6);
    expect(r.altidTotalCost).toBeCloseTo(172.8, 6);
    expect(r.savingsPerYear).toBeCloseTo(1427.2, 6);
  });

  it("giver negativ besparelse ærligt hvis Altid er dyrere", () => {
    const dyrAltid: CachedProduct = { ...altid, points: [
      { yearlyConsumption: 2000, totalCost: 2000 },
      { yearlyConsumption: 4000, totalCost: 2000 },
    ]};
    const r = computeSavings({ current, altid: dyrAltid, yearlyConsumption: 4000 });
    expect(r.savingsPerYear).toBeLessThan(0);
  });
});
