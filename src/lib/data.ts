import savingsData from "../../data/current/savings.json";
import type { ProductSnapshot } from "./types";

const snapshots = savingsData as ProductSnapshot[];

// Per-bank avatar color, keyed by bankId. This is a presentation-only
// concern, so it lives here rather than in /data/banks.json, which is
// reserved for crawler configuration.
const AVATAR_COLORS: Record<string, string> = {
  ally: "#7c3aed",
  marcus: "#2563eb",
  discover: "#f97316",
  "capital-one": "#ef4444",
  synchrony: "#14b8a6",
  barclays: "#06b6d4",
};

export function getAvatarColor(bankId: string): string {
  return AVATAR_COLORS[bankId] ?? "#64748b";
}

export function getVerifiedSnapshots(): ProductSnapshot[] {
  return snapshots.filter((s) => s.status === "verified");
}

export function sortByApyDesc(items: ProductSnapshot[]): ProductSnapshot[] {
  return [...items].sort((a, b) => b.apy - a.apy);
}

export function trendDirection(trend: number[]): "up" | "down" | "flat" {
  if (trend.length < 2) return "flat";
  const delta = trend[trend.length - 1] - trend[0];
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export interface DashboardMetrics {
  highest: ProductSnapshot;
  averageApy: number;
  averageApyDelta: number;
  bankCount: number;
  overallTrend: "up" | "down" | "flat";
}

export function computeMetrics(items: ProductSnapshot[]): DashboardMetrics {
  const sorted = sortByApyDesc(items);
  const averageApy = items.reduce((sum, i) => sum + i.apy, 0) / items.length;

  // "vs last check" delta, averaged across banks that have at least
  // two trend points. This is computed from the sample trend series
  // rather than hardcoded, so it stays honest once real history exists.
  const deltas = items
    .filter((i) => i.recentApyTrend.length >= 2)
    .map((i) => i.recentApyTrend[i.recentApyTrend.length - 1] - i.recentApyTrend[i.recentApyTrend.length - 2]);
  const averageApyDelta = deltas.length ? deltas.reduce((sum, d) => sum + d, 0) / deltas.length : 0;

  return {
    highest: sorted[0],
    averageApy,
    averageApyDelta,
    bankCount: items.length,
    overallTrend: averageApyDelta > 0 ? "up" : averageApyDelta < 0 ? "down" : "flat",
  };
}

export function formatLastChecked(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCurrency(value: number | null): string {
  if (value === null) return "Not published";
  return value === 0 ? "$0" : `$${value.toLocaleString("en-US")}`;
}
