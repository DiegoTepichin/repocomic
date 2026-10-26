import type { CSSProperties } from "react";
import { type Child, div, type Element, h } from "./element.js";
import type { RepoStats } from "./stats.js";
import { totalCommits } from "./stats.js";
import { languageColor, type Theme } from "./themes.js";

export type FormatName = "poster" | "card";

export const FORMATS: Record<FormatName, { width: number; height: number }> = {
  poster: { width: 1080, height: 1350 },
  card: { width: 1200, height: 630 },
};

export function isFormatName(value: string): value is FormatName {
  return value in FORMATS;
}

export const DISPLAY_FONT = "Bangers";
export const BODY_FONT = "Comic Neue";

/** Avatar images keyed by login, as data URIs. Missing logins get initials. */
export type Avatars = Record<string, string>;

export interface LayoutInput {
  stats: RepoStats;
  theme: Theme;
  avatars?: Avatars;
}

export function layout(format: FormatName, input: LayoutInput): Element {
  return format === "poster" ? poster(input) : card(input);
}

const BORDER = 6;
const MAX_DESCRIPTION = 150;

function poster({ stats, theme, avatars = {} }: LayoutInput): Element {
  return page(
    theme,
    FORMATS.poster,
    { padding: 36, gap: 22 },
    masthead(stats, theme),
    cover(stats, theme, { height: 400, titleWidth: 940, burstSize: 240 }),
    bubble(stats, theme, 30),
    div(
      { gap: 22, height: 350 },
      heroes(stats, theme, avatars, { flex: 1 }),
      powers(stats, theme, { flex: 1 }),
    ),
    saga(stats, theme, { height: 210 }, 52),
    footer(stats, theme, 3),
  );
}

function card({ stats, theme }: LayoutInput): Element {
  return page(
    theme,
    FORMATS.card,
    { padding: 28, gap: 20, flexDirection: "row" },
    div(
      { flexDirection: "column", gap: 18, width: 640 },
      cover(stats, theme, { height: 400, titleWidth: 584, burstSize: 190 }),
      footer(stats, theme, 0),
    ),
    div(
      { flexDirection: "column", gap: 18, flex: 1 },
      bubble(stats, theme, 24),
      saga(stats, theme, { flex: 1 }, 26),
    ),
  );
}

function page(
  theme: Theme,
  size: { width: number; height: number },
  style: CSSProperties,
  ...children: Child[]
): Element {
  return div(
    {
      ...size,
      flexDirection: "column",
      boxSizing: "border-box",
      backgroundColor: theme.paper,
      color: theme.ink,
      fontFamily: BODY_FONT,
      ...style,
    },
    ...children,
  );
}

function panel(theme: Theme, style: CSSProperties, ...children: Child[]): Element {
  return div(
    {
      border: `${BORDER}px solid ${theme.ink}`,
      backgroundColor: theme.panel,
      boxShadow: `8px 8px 0 ${theme.ink}`,
      position: "relative",
      ...style,
    },
    ...children,
  );
}

function caption(text: string, theme: Theme): Element {
  return div(
    {
      position: "absolute",
      top: -BORDER,
      left: -BORDER,
      backgroundColor: theme.burst,
      color: theme.burstInk,
      border: `${BORDER}px solid ${theme.ink}`,
      padding: "4px 14px 0",
      fontFamily: DISPLAY_FONT,
      fontSize: 30,
      letterSpacing: 1,
    },
    text,
  );
}

function masthead(stats: RepoStats, theme: Theme): Element {
  const issue = stats.latestRelease ? `ISSUE ${stats.latestRelease.tag}` : "ISSUE #1";
  const right = [stats.license, `SINCE ${new Date(stats.createdAt).getUTCFullYear()}`]
    .filter(Boolean)
    .join(" · ");
  return div(
    {
      justifyContent: "space-between",
      alignItems: "center",
      fontFamily: DISPLAY_FONT,
      fontSize: 30,
      letterSpacing: 2,
      borderBottom: `${BORDER}px solid ${theme.ink}`,
      paddingBottom: 6,
    },
    h("span", {}, `REPOCOMIC PRESENTS · ${issue}`),
    h("span", {}, right),
  );
}

function cover(
  stats: RepoStats,
  theme: Theme,
  size: { height: number; titleWidth: number; burstSize: number },
): Element {
  const titleSize = fitTitle(stats.name, size.titleWidth - size.burstSize * 0.75);
  const light = theme.name === "noir";
  return panel(
    theme,
    {
      height: size.height,
      backgroundColor: theme.cover,
      backgroundImage: `radial-gradient(circle, ${theme.dots} 2.2px, transparent 2.6px)`,
      backgroundSize: "14px 14px",
      flexDirection: "column",
      justifyContent: "flex-end",
      padding: "0 34px 26px",
      overflow: "hidden",
    },
    div(
      {
        fontWeight: 700,
        fontSize: 34,
        color: light ? "#ffffff" : theme.ink,
        marginBottom: -6,
      },
      `${stats.owner} /`,
    ),
    div(
      {
        fontFamily: DISPLAY_FONT,
        fontSize: titleSize,
        lineHeight: 0.95,
        color: light ? "#ffffff" : theme.ink,
        letterSpacing: 2,
        textShadow: `6px 6px 0 ${light ? theme.burst : "#ffffff"}`,
      },
      stats.name.toUpperCase(),
    ),
    starburst(stats.stars, theme, size.burstSize),
  );
}

/** Font size that keeps the repository name on one line within `width` pixels. */
export function fitTitle(name: string, width: number): number {
  const averageGlyphWidth = 0.46;
  return Math.round(Math.min(240, width / (Math.max(name.length, 3) * averageGlyphWidth)));
}

function starburst(stars: number, theme: Theme, size: number): Element {
  return div(
    {
      position: "absolute",
      top: 16,
      right: 16,
      width: size,
      height: size,
      alignItems: "center",
      justifyContent: "center",
      transform: "rotate(-10deg)",
    },
    h("img", {
      src: burstSvg(theme, size),
      width: size,
      height: size,
      style: { position: "absolute", top: 0, left: 0 },
    }),
    div(
      {
        position: "relative",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: DISPLAY_FONT,
        color: theme.burstInk,
        lineHeight: 0.9,
      },
      div({ fontSize: size * 0.27 }, compact(stars)),
      div({ fontSize: size * 0.15, letterSpacing: 2 }, stars === 1 ? "STAR!" : "STARS!"),
    ),
  );
}

export function burstSvg(theme: Theme, size: number, points = 16): string {
  const center = size / 2;
  const vertices = Array.from({ length: points * 2 }, (_, i) => {
    const radius = i % 2 === 0 ? center - 4 : center * 0.68;
    const angle = (Math.PI * i) / points;
    return `${(center + radius * Math.cos(angle)).toFixed(1)},${(center + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><polygon points="${vertices}" fill="${theme.burst}" stroke="${theme.ink}" stroke-width="6" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function bubble(stats: RepoStats, theme: Theme, fontSize: number): Element {
  const text =
    stats.description?.trim() || "No description yet. The legend is still being written!";
  return div(
    { flexDirection: "column" },
    div(
      {
        backgroundColor: theme.bubble,
        border: `${BORDER}px solid ${theme.ink}`,
        borderRadius: 36,
        padding: "18px 30px",
        fontSize,
        fontWeight: 700,
        lineHeight: 1.25,
      },
      `“${truncate(text, MAX_DESCRIPTION)}”`,
    ),
    div({
      width: 34,
      height: 34,
      marginLeft: 70,
      marginTop: -20,
      backgroundColor: theme.bubble,
      borderRight: `${BORDER}px solid ${theme.ink}`,
      borderBottom: `${BORDER}px solid ${theme.ink}`,
      transform: "rotate(45deg)",
    }),
  );
}

function heroes(stats: RepoStats, theme: Theme, avatars: Avatars, style: CSSProperties): Element {
  const people = stats.contributors.slice(0, 6);
  return panel(
    theme,
    { flexDirection: "column", padding: "56px 16px 12px", ...style },
    caption(people.length === 1 ? "THE HERO" : "THE HEROES", theme),
    div(
      { flexWrap: "wrap", rowGap: 8, columnGap: 10, justifyContent: "center" },
      ...people.map((person) =>
        hero(person.login, person.contributions, avatars[person.login], theme, people.length),
      ),
    ),
  );
}

function hero(
  login: string,
  contributions: number,
  avatar: string | undefined,
  theme: Theme,
  count: number,
): Element {
  const size = count <= 2 ? 120 : count === 3 ? 88 : count === 4 ? 80 : 70;
  const face = avatar
    ? h("img", {
        src: avatar,
        width: size,
        height: size,
        style: { borderRadius: size, border: `4px solid ${theme.ink}` },
      })
    : div(
        {
          width: size,
          height: size,
          borderRadius: size,
          border: `4px solid ${theme.ink}`,
          backgroundColor: theme.cover,
          alignItems: "center",
          justifyContent: "center",
          fontFamily: DISPLAY_FONT,
          fontSize: size * 0.45,
          color: theme.name === "noir" ? "#ffffff" : theme.ink,
        },
        initials(login),
      );
  return div(
    { flexDirection: "column", alignItems: "center", width: count <= 2 || count === 4 ? 190 : 136 },
    face,
    div({ fontWeight: 700, fontSize: 20, marginTop: 6 }, truncate(login, 14)),
    div({ fontSize: 16 }, `${compact(contributions)} commits`),
  );
}

function powers(stats: RepoStats, theme: Theme, style: CSSProperties): Element {
  const languages = stats.languages.slice(0, 5);
  return panel(
    theme,
    { flexDirection: "column", padding: "62px 24px 18px", gap: 14, ...style },
    caption("THE POWERS", theme),
    languages.length === 0
      ? div({ fontSize: 22 }, "Pure mystery. No code detected yet.")
      : div(
          {
            height: 30,
            border: `4px solid ${theme.ink}`,
            overflow: "hidden",
          },
          ...languages.map((language, index) =>
            div({
              width: `${Math.max(language.share * 100, 1.5)}%`,
              backgroundColor: languageColor(language.name, index, theme),
              borderRight: index < languages.length - 1 ? `3px solid ${theme.ink}` : "none",
            }),
          ),
        ),
    ...languages.map((language, index) =>
      div(
        { alignItems: "center", gap: 10, fontSize: 22, fontWeight: 700 },
        div({
          width: 18,
          height: 18,
          borderRadius: 18,
          border: `3px solid ${theme.ink}`,
          backgroundColor: languageColor(language.name, index, theme),
        }),
        div({ flex: 1 }, language.name),
        div({}, percent(language.share)),
      ),
    ),
  );
}

function saga(stats: RepoStats, theme: Theme, style: CSSProperties, weeks: number): Element {
  const recent = stats.weeklyCommits.slice(-weeks);
  const peak = Math.max(1, ...recent);
  const total = totalCommits(stats);
  return panel(
    theme,
    { flexDirection: "column", padding: "60px 22px 16px", ...style },
    caption("THE SAGA", theme),
    div(
      {
        position: "absolute",
        top: 8,
        right: 18,
        fontFamily: DISPLAY_FONT,
        fontSize: 30,
        letterSpacing: 1,
      },
      recent.length === 0 ? "THE STORY BEGINS..." : `${compact(total)} COMMITS IN A YEAR!`,
    ),
    div(
      { flex: 1, alignItems: "flex-end", gap: 3, borderBottom: `4px solid ${theme.ink}` },
      ...recent.map((count) =>
        div({
          flex: 1,
          height: `${count === 0 ? 2 : Math.max(6, (count / peak) * 100)}%`,
          backgroundColor: count === 0 ? theme.ink : theme.bars,
          border: count === 0 ? "none" : `2px solid ${theme.ink}`,
        }),
      ),
    ),
    div(
      { justifyContent: "space-between", fontSize: 16, marginTop: 4 },
      h("span", {}, `${weeks} weeks ago`),
      h("span", {}, "this week"),
    ),
  );
}

function footer(stats: RepoStats, theme: Theme, topics: number): Element {
  const facts = [
    `${compact(stats.forks)} forks`,
    `${compact(stats.openIssues)} open issues`,
    ...stats.topics.slice(0, topics).map((topic) => `#${topic}`),
  ];
  return div(
    { justifyContent: "space-between", alignItems: "center", gap: 12 },
    div(
      { gap: 10, flexWrap: "wrap" },
      ...facts.map((fact) =>
        div(
          {
            border: `3px solid ${theme.ink}`,
            borderRadius: 20,
            padding: "2px 14px",
            fontSize: 18,
            fontWeight: 700,
            backgroundColor: theme.panel,
          },
          fact,
        ),
      ),
    ),
    div(
      { fontFamily: DISPLAY_FONT, fontSize: 22, letterSpacing: 1, flexShrink: 0 },
      "MADE WITH REPOCOMIC",
    ),
  );
}

export function initials(login: string): string {
  const capitals = login.replace(/[^A-Z]/g, "");
  return (capitals.length >= 2 ? capitals : login).slice(0, 2).toUpperCase();
}

export function compact(value: number): string {
  if (value >= 1_000_000) return `${trimZero((value / 1_000_000).toFixed(1))}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1_000) return `${trimZero((value / 1000).toFixed(1))}K`;
  return String(value);
}

export function percent(share: number): string {
  const value = share * 100;
  return value < 1 ? "<1%" : `${Math.round(value)}%`;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function trimZero(text: string): string {
  return text.replace(/\.0$/, "");
}
