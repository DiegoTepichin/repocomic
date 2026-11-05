import { describe, expect, it } from "vitest";
import { fight } from "../src/battle.js";
import type { Child } from "../src/element.js";
import { FORMATS } from "../src/layout.js";
import { renderBattlePng, renderBattleSvg } from "../src/render.js";
import { THEMES, type ThemeName } from "../src/themes.js";
import { versus } from "../src/versus.js";
import { loadStats } from "./helpers.js";

function texts(node: Child): string[] {
  if (node === null || node === undefined || node === false) return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  const children = node.props.children;
  return (Array.isArray(children) ? children : [children]).flatMap(texts);
}

const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

async function bigAgainstSmall() {
  return fight(await loadStats("large"), await loadStats("small"));
}

describe("versus layout", () => {
  it("shows both fighters, their scores, every round and the verdict", async () => {
    const battle = await bigAgainstSmall();

    const words = texts(versus({ battle, theme: THEMES.classic }));

    for (const expected of [
      "VERCEL /",
      "SATORI",
      "DIEGOTEPICHIN /",
      "MCP-MEXICO",
      "WINNER!",
      "VS",
      "THE SCOREBOARD",
      "STARS · 40%",
      "COMMITS IN A YEAR · 35%",
      "FORKS · 25%",
      "14K",
      String(battle.scoreA),
      String(battle.scoreB),
      "“satori takes the issue, 93 to 7!”",
    ]) {
      expect(words).toContain(expected);
    }
  });

  it("crowns nobody in a draw", async () => {
    const stats = await loadStats("small");
    const battle = fight(stats, { ...stats, name: "twin" });

    const words = texts(versus({ battle, theme: THEMES.pop }));

    expect(words).not.toContain("WINNER!");
    expect(words).toContain("“A perfect draw! Nobody blinks.”");
  });

  it("crowns the second repository when it wins", async () => {
    const battle = fight(await loadStats("small"), await loadStats("large"));

    const words = texts(versus({ battle, theme: THEMES.classic }));

    expect(words.filter((word) => word === "WINNER!")).toHaveLength(1);
    expect(words).toContain("“satori takes the issue, 93 to 7!”");
  });

  it.each(THEME_NAMES)("gives the two fighters different colours in %s", (theme) => {
    const [left, right] = THEMES[theme].sides;

    expect(left).not.toBe(right);
  });

  it.each(THEME_NAMES)("renders the %s poster at poster size", async (theme) => {
    const battle = await bigAgainstSmall();

    const svg = await renderBattleSvg(battle, { theme });

    expect(svg).toContain(`width="${FORMATS.poster.width}"`);
    expect(svg).toContain(`height="${FORMATS.poster.height}"`);
    expect(svg).toContain(`fill="${THEMES[theme].paper}"`);
  });

  it.each(THEME_NAMES)("rasterises the %s poster to PNG", async (theme) => {
    const png = await renderBattlePng(await bigAgainstSmall(), { theme });

    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(FORMATS.poster.width);
    expect(png.readUInt32BE(20)).toBe(FORMATS.poster.height);
  });
});
