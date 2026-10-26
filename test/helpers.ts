import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Fetch, fetchRepoStats } from "../src/github.js";
import type { RepoStats } from "../src/stats.js";

export const FIXTURES = join(import.meta.dirname, "fixtures");

const ROUTES: [RegExp, string][] = [
  [/\/stats\/commit_activity$/, "commit_activity.json"],
  [/\/releases\/latest$/, "release.json"],
  [/\/contributors\?per_page=\d+$/, "contributors.json"],
  [/\/languages$/, "languages.json"],
  [/\/repos\/[^/]+\/[^/]+$/, "repo.json"],
];

/** A fetch that answers from recorded GitHub responses in `test/fixtures/<name>/`. */
export function recordedFetch(
  name: "small" | "large",
  overrides: Record<string, Response> = {},
): Fetch {
  return async (url) => {
    for (const [suffix, response] of Object.entries(overrides)) {
      if (url.endsWith(suffix)) return response.clone();
    }
    const route = ROUTES.find(([pattern]) => pattern.test(url));
    if (!route) return new Response("not found", { status: 404 });
    return new Response(readFileSync(join(FIXTURES, name, route[1]), "utf8"), { status: 200 });
  };
}

export function loadStats(name: "small" | "large"): Promise<RepoStats> {
  const ref = name === "small" ? "DiegoTepichin/mcp-mexico" : "vercel/satori";
  return fetchRepoStats(ref, { fetch: recordedFetch(name), retryDelayMs: 0 });
}
