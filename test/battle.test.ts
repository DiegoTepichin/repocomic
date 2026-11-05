import { describe, expect, it } from "vitest";
import { fight, METRICS } from "../src/battle.js";
import type { RepoStats } from "../src/stats.js";
import { loadStats } from "./helpers.js";

async function withNumbers(
  name: string,
  numbers: { stars: number; forks: number; commits: number },
): Promise<RepoStats> {
  return {
    ...(await loadStats("small")),
    name,
    stars: numbers.stars,
    forks: numbers.forks,
    weeklyCommits: [numbers.commits],
  };
}

describe("fight", () => {
  it("weights add up to one", () => {
    expect(METRICS.reduce((sum, metric) => sum + metric.weight, 0)).toBeCloseTo(1);
  });

  it("splits each metric in proportion to the two values", async () => {
    const a = await withNumbers("big", { stars: 800, forks: 50, commits: 200 });
    const b = await withNumbers("small", { stars: 200, forks: 200, commits: 300 });

    const battle = fight(a, b);

    expect(battle.rounds.map((round) => round.shareA)).toEqual([0.8, 0.4, 0.2]);
    expect(battle.rounds.map((round) => [round.a, round.b])).toEqual([
      [800, 200],
      [200, 300],
      [50, 200],
    ]);
  });

  it("scores the weighted sum and always totals 100", async () => {
    const a = await withNumbers("big", { stars: 800, forks: 50, commits: 200 });
    const b = await withNumbers("small", { stars: 200, forks: 200, commits: 300 });

    const battle = fight(a, b);

    expect(battle.scoreA).toBe(51);
    expect(battle.scoreB).toBe(49);
    expect(battle.winner).toBe("a");
  });

  it("names the second repository when it scores higher", async () => {
    const a = await withNumbers("quiet", { stars: 10, forks: 1, commits: 5 });
    const b = await withNumbers("busy", { stars: 500, forks: 80, commits: 400 });

    expect(fight(a, b).winner).toBe("b");
  });

  it("calls identical repositories a draw", async () => {
    const stats = await withNumbers("twin", { stars: 42, forks: 7, commits: 12 });

    const battle = fight(stats, { ...stats, name: "twin-two" });

    expect([battle.scoreA, battle.scoreB, battle.winner]).toEqual([50, 50, "draw"]);
  });

  it("gives an even split to a metric both repositories have none of", async () => {
    const empty = await withNumbers("empty", { stars: 0, forks: 0, commits: 0 });

    const battle = fight(empty, { ...empty, name: "empty-two" });

    expect(battle.rounds.every((round) => round.shareA === 0.5)).toBe(true);
  });

  it("still scores a repository whose commit data is not ready yet", async () => {
    const ready = await withNumbers("ready", { stars: 100, forks: 10, commits: 50 });
    const pending: RepoStats = { ...ready, name: "pending", weeklyCommits: [] };

    const battle = fight(ready, pending);

    expect(battle.rounds[1]?.shareA).toBe(1);
    expect(battle.winner).toBe("a");
  });
});
