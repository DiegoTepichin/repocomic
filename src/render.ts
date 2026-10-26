import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import type { ReactNode } from "react";
import satori from "satori";
import type { Fetch } from "./github.js";
import {
  type Avatars,
  BODY_FONT,
  DISPLAY_FONT,
  FORMATS,
  type FormatName,
  layout,
} from "./layout.js";
import type { RepoStats } from "./stats.js";
import { THEMES, type ThemeName } from "./themes.js";

export interface RenderOptions {
  format?: FormatName;
  theme?: ThemeName;
  /** Avatars already in hand; otherwise they are downloaded unless `offline` is set. */
  avatars?: Avatars;
  offline?: boolean;
  fetch?: Fetch;
}

const FONT_DIR = new URL("../assets/fonts/", import.meta.url);

let fonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] | undefined;

function loadFonts(): NonNullable<typeof fonts> {
  fonts ??= [
    { name: DISPLAY_FONT, data: font("Bangers-Regular.ttf"), weight: 400, style: "normal" },
    { name: BODY_FONT, data: font("ComicNeue-Regular.ttf"), weight: 400, style: "normal" },
    { name: BODY_FONT, data: font("ComicNeue-Bold.ttf"), weight: 700, style: "normal" },
  ];
  return fonts;
}

function font(file: string): Buffer {
  return readFileSync(fileURLToPath(new URL(file, FONT_DIR)));
}

export async function renderSvg(stats: RepoStats, options: RenderOptions = {}): Promise<string> {
  const format = options.format ?? "poster";
  const avatars =
    options.avatars ?? (options.offline ? {} : await fetchAvatars(stats, options.fetch));
  const tree = layout(format, { stats, theme: THEMES[options.theme ?? "classic"], avatars });
  return satori(tree as unknown as ReactNode, { ...FORMATS[format], fonts: loadFonts() });
}

export async function renderPng(stats: RepoStats, options: RenderOptions = {}): Promise<Buffer> {
  const svg = await renderSvg(stats, options);
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "zoom", value: 1 } }).render().asPng());
}

/** Download contributor avatars as data URIs; failures are skipped so the layout uses initials. */
export async function fetchAvatars(stats: RepoStats, fetcher?: Fetch): Promise<Avatars> {
  const get: Fetch = fetcher ?? ((url, init) => fetch(url, init));
  const entries = await Promise.all(
    stats.contributors.map(async (person): Promise<[string, string] | null> => {
      if (!person.avatarUrl) return null;
      try {
        const url = `${person.avatarUrl}${person.avatarUrl.includes("?") ? "&" : "?"}s=160`;
        const response = await get(url);
        if (!response.ok) return null;
        const type = response.headers.get("content-type") ?? "image/png";
        const data = Buffer.from(await response.arrayBuffer()).toString("base64");
        return [person.login, `data:${type};base64,${data}`];
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((entry) => entry !== null));
}
