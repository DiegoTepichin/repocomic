import { describe, expect, it } from "vitest";
import { fetchRepoStats, parseRepoRef } from "../src/github.js";
import { parseRepoStats, StatsError, totalCommits } from "../src/stats.js";
import { loadStats, recordedFetch } from "./helpers.js";

describe("parseRepoRef", () => {
  it.each([
    ["vercel/satori", "vercel", "satori"],
    ["https://github.com/vercel/satori", "vercel", "satori"],
    ["https://github.com/vercel/satori.git/", "vercel", "satori"],
    ["  owner/my.repo_name-2 ", "owner", "my.repo_name-2"],
  ])("parses %s", (input, owner, name) => {
    expect(parseRepoRef(input)).toEqual({ owner, name });
  });

  it.each(["satori", "a/b/c", "https://gitlab.com/a/b", ""])("rejects %j", (input) => {
    expect(() => parseRepoRef(input)).toThrow(StatsError);
  });
});

describe("fetchRepoStats", () => {
  it("maps a large repository", async () => {
    const stats = await loadStats("large");

    expect(stats.owner).toBe("vercel");
    expect(stats.name).toBe("satori");
    expect(stats.stars).toBe(14132);
    expect(stats.license).toBe("MPL-2.0");
    expect(stats.languages[0]?.name).toBe("TypeScript");
    expect(stats.languages.reduce((sum, l) => sum + l.share, 0)).toBeCloseTo(1);
    expect(stats.contributors).toHaveLength(6);
    expect(stats.contributors[0]?.login).toBe("shuding");
    expect(stats.weeklyCommits).toHaveLength(52);
    expect(totalCommits(stats)).toBe(144);
    expect(stats.latestRelease?.tag).toBe("0.63.2");
  });

  it("maps a small repository with one contributor", async () => {
    const stats = await loadStats("small");

    expect(stats.contributors.map((c) => c.login)).toEqual(["DiegoTepichin"]);
    expect(stats.latestRelease?.tag).toBe("v0.1.3");
  });

  it("retries while GitHub computes commit statistics", async () => {
    let calls = 0;
    const base = recordedFetch("large");
    const stats = await fetchRepoStats("vercel/satori", {
      retryDelayMs: 0,
      fetch: async (url, init) => {
        if (url.endsWith("/stats/commit_activity") && calls++ < 2) {
          return new Response(null, { status: 202 });
        }
        return base(url, init);
      },
    });

    expect(calls).toBe(3);
    expect(stats.weeklyCommits).toHaveLength(52);
  });

  it("gives up on statistics after the retries and returns no weeks", async () => {
    const stats = await fetchRepoStats("vercel/satori", {
      retryDelayMs: 0,
      maxStatsRetries: 1,
      fetch: recordedFetch("large", {
        "/stats/commit_activity": new Response(null, { status: 202 }),
      }),
    });

    expect(stats.weeklyCommits).toEqual([]);
  });

  it("treats a missing release as none", async () => {
    const stats = await fetchRepoStats("vercel/satori", {
      retryDelayMs: 0,
      fetch: recordedFetch("large", { "/releases/latest": new Response("{}", { status: 404 }) }),
    });

    expect(stats.latestRelease).toBeNull();
  });

  it("filters bots out of contributors", async () => {
    const contributors = [
      { login: "dependabot[bot]", contributions: 99, type: "Bot" },
      { login: "human", contributions: 3, avatar_url: "https://x/a.png", type: "User" },
    ];
    const stats = await fetchRepoStats("vercel/satori", {
      retryDelayMs: 0,
      fetch: recordedFetch("large", {
        "/contributors?per_page=12": Response.json(contributors),
      }),
    });

    expect(stats.contributors.map((c) => c.login)).toEqual(["human"]);
  });

  it("sends the token and explains rate limits", async () => {
    const seen: string[] = [];
    const limited = new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } });

    const promise = fetchRepoStats("vercel/satori", {
      token: "secret",
      fetch: async (_url, init) => {
        seen.push(init?.headers?.Authorization ?? "");
        return limited.clone();
      },
    });

    await expect(promise).rejects.toThrow(/rate limit.*GITHUB_TOKEN/);
    expect(seen[0]).toBe("Bearer secret");
  });

  it("reports a missing repository", async () => {
    const promise = fetchRepoStats("nobody/nothing", {
      fetch: async () => new Response("{}", { status: 404 }),
    });

    await expect(promise).rejects.toThrow(/repository not found/);
  });
});

describe("parseRepoStats", () => {
  it("accepts stats it produced", async () => {
    const stats = await loadStats("large");

    expect(parseRepoStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats);
  });

  it.each([
    [[], "JSON object"],
    [{ owner: "a" }, "stats.name"],
  ])("rejects %j", (value, message) => {
    expect(() => parseRepoStats(value)).toThrow(message);
  });
});
