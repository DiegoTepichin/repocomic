import { describe, expect, it } from "vitest";
import type { Child, Element } from "../src/element.js";
import {
  burstSvg,
  compact,
  FORMATS,
  fitTitle,
  initials,
  layout,
  percent,
  truncate,
} from "../src/layout.js";
import type { RepoStats } from "../src/stats.js";
import { languageColor, THEMES } from "../src/themes.js";
import { loadStats } from "./helpers.js";

function texts(node: Child): string[] {
  if (node === null || node === undefined || node === false) return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  const children = node.props.children;
  return (Array.isArray(children) ? children : [children]).flatMap(texts);
}

function images(node: Child): string[] {
  if (!node || typeof node !== "object") return [];
  const own = node.type === "img" && node.props.src ? [node.props.src] : [];
  const children = node.props.children;
  return [...own, ...(Array.isArray(children) ? children : [children]).flatMap(images)];
}

describe("formatting helpers", () => {
  it.each([
    [7, "7"],
    [1234, "1.2K"],
    [1000, "1K"],
    [14132, "14K"],
    [2_500_000, "2.5M"],
  ])("compact(%d) = %s", (value, expected) => {
    expect(compact(value)).toBe(expected);
  });

  it("formats shares", () => {
    expect(percent(0.964)).toBe("96%");
    expect(percent(0.004)).toBe("<1%");
  });

  it("truncates with an ellipsis", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });

  it("derives initials from camelCase logins", () => {
    expect(initials("DiegoTepichin")).toBe("DT");
    expect(initials("shuding")).toBe("SH");
  });

  it("shrinks long titles and caps short ones", () => {
    expect(fitTitle("ab", 900)).toBe(200);
    expect(fitTitle("a-very-long-repository-name", 900)).toBeLessThan(80);
  });

  it("draws the starburst as an SVG data URI", () => {
    const uri = burstSvg(THEMES.classic, 100);
    const svg = Buffer.from(uri.split(",")[1] ?? "", "base64").toString();

    expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(svg).toContain('fill="#e63946"');
    expect(svg.match(/,/g)?.length).toBe(32);
  });
});

describe("layout", () => {
  it("puts every part of the story on the poster", async () => {
    const stats = await loadStats("large");
    const tree = layout("poster", { stats, theme: THEMES.classic });
    const words = texts(tree).join(" ");

    expect(tree.props.style?.width).toBe(FORMATS.poster.width);
    for (const expected of [
      "SATORI",
      "vercel /",
      "14K",
      "STARS!",
      "THE HEROES",
      "shuding",
      "THE POWERS",
      "TypeScript",
      "96%",
      "THE SAGA",
      "144 COMMITS IN A YEAR!",
      "ISSUE 0.63.2",
      "MPL-2.0 · SINCE 2022",
      "#css",
    ]) {
      expect(words).toContain(expected);
    }
  });

  it("uses avatars when given and initials otherwise", async () => {
    const stats = await loadStats("large");
    const withAvatar = layout("poster", {
      stats,
      theme: THEMES.classic,
      avatars: { shuding: "data:image/png;base64,AAAA" },
    });

    expect(images(withAvatar)).toContain("data:image/png;base64,AAAA");
    expect(texts(withAvatar)).toContain("JA");
  });

  it("handles an empty repository", async () => {
    const stats: RepoStats = {
      ...(await loadStats("small")),
      description: null,
      languages: [],
      contributors: [],
      weeklyCommits: [],
      latestRelease: null,
      stars: 1,
    };
    const words = texts(layout("poster", { stats, theme: THEMES.pop })).join(" ");

    expect(words).toContain("No description yet");
    expect(words).toContain("No code detected yet");
    expect(words).toContain("THE STORY BEGINS...");
    expect(words).toContain("ISSUE #1");
    expect(words).toContain("STAR!");
  });

  it("lays out the card at Open Graph size", async () => {
    const tree: Element = layout("card", { stats: await loadStats("small"), theme: THEMES.noir });

    expect(tree.props.style?.width).toBe(1200);
    expect(tree.props.style?.height).toBe(630);
    expect(texts(tree)).not.toContain("THE HEROES");
  });

  it("colours known languages and falls back to the theme palette", () => {
    expect(languageColor("TypeScript", 0, THEMES.classic)).toBe("#3178c6");
    expect(languageColor("Brainfuck", 1, THEMES.classic)).toBe(THEMES.classic.palette[1]);
    expect(languageColor("TypeScript", 0, THEMES.noir)).toBe(THEMES.noir.palette[0]);
  });
});
