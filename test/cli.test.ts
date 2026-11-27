import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { main } from "../src/cli.js";
import { recordedFetch } from "./helpers.js";

let dir: string;
let out: string[];
let err: string[];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "repocomic-"));
  out = [];
  err = [];
});

function run(args: string[], env: Record<string, string | undefined> = {}) {
  return main(args, {
    fetch: recordedFetch("large"),
    env,
    log: (m) => out.push(m),
    error: (m) => err.push(m),
  });
}

describe("cli", () => {
  it("writes a PNG poster named after the repository", async () => {
    const output = join(dir, "satori.png");

    expect(await run(["vercel/satori", "-o", output, "--offline"])).toBe(0);
    expect(readFileSync(output).subarray(1, 4).toString()).toBe("PNG");
    expect(out).toContain(`wrote ${output}`);
  });

  it("writes SVG when the output ends in .svg", async () => {
    const output = join(dir, "card.svg");

    expect(await run(["vercel/satori", "-f", "card", "-t", "pop", "-o", output, "--offline"])).toBe(
      0,
    );
    expect(readFileSync(output, "utf8")).toContain('width="1200"');
  });

  it("saves stats and renders them again without GitHub", async () => {
    const json = join(dir, "stats.json");
    await run(["vercel/satori", "--save-json", json, "-o", join(dir, "a.png"), "--offline"]);

    const offline = await main(["--from-json", json, "-o", join(dir, "b.svg"), "--offline"], {
      fetch: async () => {
        throw new Error("network used");
      },
      log: () => {},
      error: (m) => err.push(m),
    });

    expect(offline).toBe(0);
    expect(JSON.parse(readFileSync(json, "utf8")).name).toBe("satori");
  });

  it("passes GITHUB_TOKEN to the API", async () => {
    const seen: string[] = [];
    const base = recordedFetch("large");
    await main(["vercel/satori", "-o", join(dir, "t.svg"), "--offline"], {
      env: { GITHUB_TOKEN: "abc" },
      fetch: (url, init) => {
        seen.push(init?.headers?.Authorization ?? "");
        return base(url, init);
      },
      log: () => {},
    });

    expect(seen.every((header) => header === "Bearer abc")).toBe(true);
  });

  it("explains a missing repository argument", async () => {
    expect(await run([])).toBe(1);
    expect(err.join()).toContain("give a repository");
  });

  it("rejects unknown themes", async () => {
    expect(await run(["vercel/satori", "-t", "sepia"])).not.toBe(0);
    expect(err.join()).toMatch(/sepia/);
  });

  it("reports invalid saved stats", async () => {
    const json = join(dir, "bad.json");
    writeFileSync(json, "{ nope");

    expect(await run(["--from-json", json])).toBe(1);
    expect(err.join()).toContain("not valid JSON");
  });

  it("reports a missing file", async () => {
    expect(await run(["--from-json", join(dir, "missing.json")])).toBe(1);
    expect(err.join()).toContain("ENOENT");
  });

  it("prints the version", async () => {
    expect(await run(["--version"])).toBe(0);
    expect(out.join()).toMatch(/^\d+\.\d+\.\d+/);
  });

  describe("battle", () => {
    const fixtureByRepo = (url: string) =>
      (url.includes("mcp-mexico") ? recordedFetch("small") : recordedFetch("large"))(url);

    function battle(args: string[]) {
      return main(["battle", ...args], {
        fetch: fixtureByRepo,
        env: {},
        log: (m) => out.push(m),
        error: (m) => err.push(m),
      });
    }

    it("writes a versus poster named after both repositories", async () => {
      const cwd = process.cwd();
      process.chdir(dir);
      try {
        expect(await battle(["vercel/satori", "DiegoTepichin/mcp-mexico"])).toBe(0);
      } finally {
        process.chdir(cwd);
      }

      expect(out).toContain("wrote satori-vs-mcp-mexico.png");
      expect(readFileSync(join(dir, "satori-vs-mcp-mexico.png")).subarray(1, 4).toString()).toBe(
        "PNG",
      );
    });

    it("writes SVG in the chosen theme when the output ends in .svg", async () => {
      const output = join(dir, "fight.svg");

      expect(
        await battle(["vercel/satori", "DiegoTepichin/mcp-mexico", "-t", "noir", "-o", output]),
      ).toBe(0);
      const svg = readFileSync(output, "utf8");
      expect(svg).toContain('width="1080"');
      expect(svg).toContain('fill="#e9e9e6"');
    });

    it("needs two repositories", async () => {
      expect(await battle(["vercel/satori"])).not.toBe(0);
      expect(err.join()).toMatch(/repo-b/);
    });

    it("reports a repository that does not exist", async () => {
      const code = await main(["battle", "vercel/satori", "nobody/nothing"], {
        fetch: async () => new Response("not found", { status: 404 }),
        env: {},
        log: (m) => out.push(m),
        error: (m) => err.push(m),
      });

      expect(code).toBe(1);
      expect(err.join()).toMatch(/error:/);
    });
  });
});

describe("cli failures", () => {
  const offline = async (): Promise<Response> => {
    throw new TypeError("fetch failed", { cause: new Error("connect ECONNREFUSED") });
  };

  it.each([
    ["poster", ["vercel/satori"]],
    ["battle", ["battle", "vercel/satori", "DiegoTepichin/mcp-mexico"]],
  ])("prints one line and exits 1 when the network fails (%s)", async (_, args) => {
    const code = await main(args, {
      fetch: offline,
      env: {},
      log: (m) => out.push(m),
      error: (m) => err.push(m),
    });

    expect(code).toBe(1);
    expect(err).toEqual(["error: could not reach GitHub (connect ECONNREFUSED)"]);
  });

  const valid = {
    owner: "o",
    name: "n",
    url: "https://github.com/o/n",
    createdAt: "2026-01-01T00:00:00Z",
    description: null,
    license: null,
    stars: 1,
    forks: 0,
    openIssues: 0,
    topics: [],
    languages: [],
    contributors: [],
    weeklyCommits: [],
    latestRelease: null,
  };

  it.each([
    ["languages", { languages: [null] }],
    ["languages", { languages: [{ name: "TypeScript" }] }],
    ["contributors", { contributors: [{ login: "a" }] }],
    ["weeklyCommits", { weeklyCommits: ["3"] }],
    ["topics", { topics: [1] }],
    ["description", { description: 5 }],
    ["license", { license: {} }],
    ["latestRelease", { latestRelease: { tag: 1 } }],
    ["name", { name: "../escape" }],
  ])("rejects saved stats with a malformed %s", async (key, change) => {
    const json = join(dir, "bad.json");
    writeFileSync(json, JSON.stringify({ ...valid, ...change }));

    const code = await run(["--from-json", json, "--offline", "-o", join(dir, "x.svg")]);

    expect(code).toBe(1);
    expect(err).toHaveLength(1);
    expect(err[0]).toContain(`stats.${key}`);
  });

  it("accepts the minimal valid stats", async () => {
    const json = join(dir, "good.json");
    writeFileSync(json, JSON.stringify(valid));

    expect(await run(["--from-json", json, "--offline", "-o", join(dir, "x.svg")])).toBe(0);
  });
});
