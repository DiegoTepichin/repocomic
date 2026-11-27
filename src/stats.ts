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

type Check = (value: unknown) => boolean;

const isString: Check = (value) => typeof value === "string";
const isNumber: Check = (value) => typeof value === "number";
const isNullableString: Check = (value) => value === null || isString(value);
/** The name becomes part of the default output file, so it must not contain a path. */
const isRepoName: Check = (value) => typeof value === "string" && /^[A-Za-z0-9._-]+$/.test(value);

function listOf(item: Check): Check {
  return (value) => Array.isArray(value) && value.every(item);
}

function shape(fields: Record<string, Check>): Check {
  return (value) =>
    isRecord(value) && Object.entries(fields).every(([key, check]) => check(value[key]));
}

const isRelease = shape({ tag: isString, publishedAt: isString });

const STATS_FIELDS: Record<keyof RepoStats, [check: Check, expected: string]> = {
  owner: [isString, "a string"],
  name: [isRepoName, "a repository name"],
  description: [isNullableString, "a string or null"],
  url: [isString, "a string"],
  stars: [isNumber, "a number"],
  forks: [isNumber, "a number"],
  openIssues: [isNumber, "a number"],
  license: [isNullableString, "a string or null"],
  createdAt: [isString, "a string"],
  topics: [listOf(isString), "an array of strings"],
  languages: [listOf(shape({ name: isString, share: isNumber })), "an array of {name, share}"],
  contributors: [
    listOf(shape({ login: isString, contributions: isNumber, avatarUrl: isString })),
    "an array of {login, contributions, avatarUrl}",
  ],
  weeklyCommits: [listOf(isNumber), "an array of numbers"],
  latestRelease: [(value) => value === null || isRelease(value), "{tag, publishedAt} or null"],
};

/** Validate data read from a `--from-json` file. */
export function parseRepoStats(value: unknown): RepoStats {
  if (!isRecord(value)) throw new StatsError("stats must be a JSON object");
  for (const [key, [check, expected]] of Object.entries(STATS_FIELDS)) {
    if (!check(value[key])) throw new StatsError(`stats.${key} must be ${expected}`);
  }
  return value as unknown as RepoStats;
}

export function totalCommits(stats: RepoStats): number {
  return stats.weeklyCommits.reduce((sum, week) => sum + week, 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
