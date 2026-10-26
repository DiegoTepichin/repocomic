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
});
