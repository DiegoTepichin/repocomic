import { describe, expect, it } from "vitest";
import { fetchAvatars, renderPng, renderSvg } from "../src/render.js";
import { loadStats } from "./helpers.js";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("render", () => {
  it("renders the poster as SVG with embedded glyphs", async () => {
    const svg = await renderSvg(await loadStats("large"), { offline: true });

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('width="1080"');
    expect(svg).toContain('height="1350"');
    expect(svg).toContain("<path");
  });

  it.each([
    ["poster", "classic", 1080, 1350],
    ["card", "noir", 1200, 630],
    ["card", "pop", 1200, 630],
  ] as const)("renders a %s in %s as PNG", async (format, theme, width, height) => {
    const png = await renderPng(await loadStats("small"), { format, theme, offline: true });

    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(pngSize(png)).toEqual({ width, height });
  });

  it("uses avatars passed in instead of downloading", async () => {
    const pixel =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==";
    const stats = await loadStats("small");

    const svg = await renderSvg(stats, { avatars: { DiegoTepichin: pixel } });

    expect(svg).toContain("<image");
  });
});

describe("fetchAvatars", () => {
  it("embeds downloaded avatars and skips failures", async () => {
    const stats = await loadStats("large");
    const avatars = await fetchAvatars(stats, async (url) => {
      if (url.includes("/u/3676859?")) throw new Error("offline");
      if (url.includes("/u/14737221?")) return new Response("missing", { status: 404 });
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
    });

    expect(avatars.styfle).toBe("data:image/jpeg;base64,AQID");
    expect(Object.keys(avatars)).toHaveLength(4);
  });

  it("asks GitHub for a 160 px avatar", async () => {
    const stats = await loadStats("small");
    const seen: string[] = [];

    await fetchAvatars(stats, async (url) => {
      seen.push(url);
      return new Response(new Uint8Array([0]));
    });

    expect(seen[0]).toMatch(/[?&]s=160$/);
  });
});
