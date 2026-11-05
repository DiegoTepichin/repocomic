import { type RepoStats, totalCommits } from "./stats.js";

export type MetricName = "stars" | "commits" | "forks";

interface Metric {
  name: MetricName;
  label: string;
  /** Share of the final score, 0 to 1. The weights add up to 1. */
  weight: number;
  read: (stats: RepoStats) => number;
}

export const METRICS: readonly Metric[] = [
  { name: "stars", label: "STARS", weight: 0.4, read: (stats) => stats.stars },
  { name: "commits", label: "COMMITS IN A YEAR", weight: 0.35, read: totalCommits },
  { name: "forks", label: "FORKS", weight: 0.25, read: (stats) => stats.forks },
];

export interface Round {
  metric: MetricName;
  label: string;
  weight: number;
  a: number;
  b: number;
  /** Repository A's slice of the pair, 0 to 1; 0.5 when both are zero. */
  shareA: number;
}

export type Winner = "a" | "b" | "draw";

export interface Battle {
  a: RepoStats;
  b: RepoStats;
  rounds: Round[];
  /** Whole-number scores out of 100 that always add up to 100. */
  scoreA: number;
  scoreB: number;
  winner: Winner;
}

/**
 * Each metric splits 100% between the two repositories in proportion to their values, so
 * 900 stars against 100 is a 90/10 round. The score is the weighted sum of those splits.
 */
export function fight(a: RepoStats, b: RepoStats): Battle {
  const rounds = METRICS.map((metric): Round => {
    const left = metric.read(a);
    const right = metric.read(b);
    const total = left + right;
    return {
      metric: metric.name,
      label: metric.label,
      weight: metric.weight,
      a: left,
      b: right,
      shareA: total === 0 ? 0.5 : left / total,
    };
  });
  const scoreA = Math.round(
    100 * rounds.reduce((sum, round) => sum + round.weight * round.shareA, 0),
  );
  const scoreB = 100 - scoreA;
  return { a, b, rounds, scoreA, scoreB, winner: pickWinner(scoreA, scoreB) };
}

function pickWinner(scoreA: number, scoreB: number): Winner {
  if (scoreA === scoreB) return "draw";
  return scoreA > scoreB ? "a" : "b";
}
