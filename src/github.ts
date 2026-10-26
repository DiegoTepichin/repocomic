import type { Contributor, Language, Release, RepoStats } from "./stats.js";
import { StatsError } from "./stats.js";

export type Fetch = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

export interface GitHubOptions {
  token?: string | undefined;
  fetch?: Fetch;
  apiUrl?: string;
  /** Delay between retries of the 202 "statistics are being computed" response. */
  retryDelayMs?: number;
  maxStatsRetries?: number;
}

const API_URL = "https://api.github.com";
const MAX_CONTRIBUTORS = 6;
/** Bots are filtered out afterwards, so ask for more than we show. */
const CONTRIBUTORS_PAGE = 12;
const MAX_LANGUAGES = 5;

/** Accepts `owner/repo` or a github.com URL. */
export function parseRepoRef(input: string): { owner: string; name: string } {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//, "")
    .replace(/\/+$/, "")
    .replace(/\.git$/, "");
  const match = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/.exec(cleaned);
  if (!match?.[1] || !match[2]) {
    throw new StatsError(`"${input}" is not a repository; use owner/repo`);
  }
  return { owner: match[1], name: match[2] };
}

export async function fetchRepoStats(ref: string, options: GitHubOptions = {}): Promise<RepoStats> {
  const { owner, name } = parseRepoRef(ref);
  const client = new GitHubClient(options);
  const base = `/repos/${owner}/${name}`;
  const [repo, languages, contributors, weeklyCommits, latestRelease] = await Promise.all([
    client.get<RepoResponse>(base),
    client.get<Record<string, number>>(`${base}/languages`),
    client.get<ContributorResponse[]>(`${base}/contributors?per_page=${CONTRIBUTORS_PAGE}`, []),
    client.commitActivity(`${base}/stats/commit_activity`),
    client.get<ReleaseResponse | null>(`${base}/releases/latest`, null),
  ]);
  return {
    owner: repo.owner.login,
    name: repo.name,
    description: repo.description,
    url: repo.html_url,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    license:
      repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : null,
    createdAt: repo.created_at,
    topics: repo.topics ?? [],
    languages: toLanguages(languages),
    contributors: toContributors(contributors),
    weeklyCommits,
    latestRelease: toRelease(latestRelease),
  };
}

interface RepoResponse {
  name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: { spdx_id: string | null } | null;
  created_at: string;
  topics?: string[];
}

interface ContributorResponse {
  login?: string;
  contributions: number;
  avatar_url?: string;
  type?: string;
}

interface ReleaseResponse {
  tag_name?: string;
  published_at?: string | null;
}

class GitHubClient {
  private readonly fetch: Fetch;
  private readonly headers: Record<string, string>;
  private readonly apiUrl: string;
  private readonly retryDelayMs: number;
  private readonly maxStatsRetries: number;

  constructor(options: GitHubOptions) {
    this.fetch = options.fetch ?? ((url, init) => fetch(url, init));
    this.apiUrl = options.apiUrl ?? API_URL;
    this.retryDelayMs = options.retryDelayMs ?? 1500;
    this.maxStatsRetries = options.maxStatsRetries ?? 4;
    this.headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "repocomic",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    };
  }

  /** GET a JSON resource; when `fallback` is given, a 404 (or 204) returns it instead of failing. */
  async get<T>(path: string, ...fallback: [T] | []): Promise<T> {
    const response = await this.request(path);
    if ((response.status === 404 || response.status === 204) && fallback.length === 1) {
      return fallback[0];
    }
    await this.ensureOk(response, path);
    return (await response.json()) as T;
  }

  async commitActivity(path: string): Promise<number[]> {
    for (let attempt = 0; attempt <= this.maxStatsRetries; attempt += 1) {
      const response = await this.request(path);
      if (response.status === 202) {
        await sleep(this.retryDelayMs);
        continue;
      }
      if (response.status === 204) return [];
      await this.ensureOk(response, path);
      const weeks = (await response.json()) as { total: number }[];
      return Array.isArray(weeks) ? weeks.map((week) => week.total) : [];
    }
    return [];
  }

  private request(path: string): Promise<Response> {
    return this.fetch(`${this.apiUrl}${path}`, { headers: this.headers });
  }

  private async ensureOk(response: Response, path: string): Promise<void> {
    if (response.ok) return;
    if (response.status === 404) throw new StatsError(`repository not found (${path})`);
    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0" || response.status === 429) {
        throw new StatsError(
          "GitHub rate limit reached; set GITHUB_TOKEN to a personal access token and try again",
        );
      }
    }
    throw new StatsError(`GitHub API returned ${response.status} for ${path}`);
  }
}

function toLanguages(bytes: Record<string, number>): Language[] {
  const total = Object.values(bytes).reduce((sum, value) => sum + value, 0);
  if (total === 0) return [];
  return Object.entries(bytes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_LANGUAGES)
    .map(([name, value]) => ({ name, share: value / total }));
}

function toContributors(contributors: ContributorResponse[]): Contributor[] {
  return contributors
    .filter((c) => c.login && c.type !== "Bot" && !c.login.endsWith("[bot]"))
    .slice(0, MAX_CONTRIBUTORS)
    .map((c) => ({
      login: c.login ?? "",
      contributions: c.contributions,
      avatarUrl: c.avatar_url ?? "",
    }));
}

function toRelease(release: ReleaseResponse | null): Release | null {
  if (!release?.tag_name) return null;
  return { tag: release.tag_name, publishedAt: release.published_at ?? "" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
