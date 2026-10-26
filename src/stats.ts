/** Everything a poster shows about a repository, independent of where it came from. */
export interface RepoStats {
  owner: string;
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  createdAt: string;
  topics: string[];
  languages: Language[];
  contributors: Contributor[];
  /** Commits per week for the last 52 weeks, oldest first. Empty when GitHub has no data yet. */
  weeklyCommits: number[];
  latestRelease: Release | null;
}

export interface Language {
  name: string;
  /** Share of the code base, 0 to 1. */
  share: number;
}

export interface Contributor {
  login: string;
  contributions: number;
  avatarUrl: string;
}

export interface Release {
  tag: string;
  publishedAt: string;
}

export class StatsError extends Error {
  override name = "StatsError";
}

/** Validate data read from a `--from-json` file. */
export function parseRepoStats(value: unknown): RepoStats {
  if (!isRecord(value)) throw new StatsError("stats must be a JSON object");
  const stats = value as Partial<RepoStats>;
  for (const key of ["owner", "name", "url", "createdAt"] as const) {
    if (typeof stats[key] !== "string") throw new StatsError(`stats.${key} must be a string`);
  }
  for (const key of ["stars", "forks", "openIssues"] as const) {
    if (typeof stats[key] !== "number") throw new StatsError(`stats.${key} must be a number`);
  }
  for (const key of ["topics", "languages", "contributors", "weeklyCommits"] as const) {
    if (!Array.isArray(stats[key])) throw new StatsError(`stats.${key} must be an array`);
  }
  return stats as RepoStats;
}

export function totalCommits(stats: RepoStats): number {
  return stats.weeklyCommits.reduce((sum, week) => sum + week, 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
