import type { Battle, Round } from "./battle.js";
import { div, type Element, h } from "./element.js";
import {
  BORDER,
  burstSvg,
  caption,
  compact,
  DISPLAY_FONT,
  FORMATS,
  fitTitle,
  page,
  panel,
  truncate,
} from "./layout.js";
import type { Theme } from "./themes.js";

export interface VersusInput {
  battle: Battle;
  theme: Theme;
}

const CONTENT_WIDTH = FORMATS.poster.width - 72;
const FIGHTER_HEIGHT = 430;
const BURST_SIZE = 180;
const MIN_BAR_SHARE = 0.03;

export function versus({ battle, theme }: VersusInput): Element {
  return page(
    theme,
    FORMATS.poster,
    { padding: 36, gap: 22 },
    masthead(battle, theme),
    fighters(battle, theme),
    scoreboard(battle, theme),
    verdict(battle, theme),
    footer(theme),
  );
}

function masthead(battle: Battle, theme: Theme): Element {
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
    h("span", {}, "REPOCOMIC PRESENTS · THE BATTLE"),
    h("span", {}, `${battle.rounds.length} ROUNDS`),
  );
}

function fighters(battle: Battle, theme: Theme): Element {
  return div(
    { gap: 22, height: FIGHTER_HEIGHT, position: "relative" },
    fighter(battle, "a", theme),
    fighter(battle, "b", theme),
    versusBurst(theme),
  );
}

function fighter(battle: Battle, side: "a" | "b", theme: Theme): Element {
  const stats = side === "a" ? battle.a : battle.b;
  const score = side === "a" ? battle.scoreA : battle.scoreB;
  const color = side === "a" ? theme.bars : theme.burst;
  const titleWidth = (CONTENT_WIDTH - 22) / 2 - BURST_SIZE / 2 - 40;
  return panel(
    theme,
    {
      flex: 1,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.cover,
      backgroundImage: `radial-gradient(circle, ${theme.dots} 2.2px, transparent 2.6px)`,
      backgroundSize: "14px 14px",
      padding: "48px 18px 18px",
      gap: 10,
    },
    battle.winner === side ? caption("WINNER!", theme) : null,
    div(
      { fontFamily: DISPLAY_FONT, fontSize: 34, letterSpacing: 2, color: theme.ink },
      `${truncate(stats.owner, 16).toUpperCase()} /`,
    ),
    div(
      {
        fontFamily: DISPLAY_FONT,
        fontSize: Math.min(150, fitTitle(stats.name, titleWidth)),
        lineHeight: 1,
        color: theme.ink,
      },
      stats.name.toUpperCase(),
    ),
    div(
      {
        fontFamily: DISPLAY_FONT,
        fontSize: 120,
        lineHeight: 1,
        color,
        textShadow: `4px 4px 0 ${theme.ink}`,
      },
      String(score),
    ),
  );
}

function versusBurst(theme: Theme): Element {
  return div(
    {
      position: "absolute",
      top: (FIGHTER_HEIGHT - BURST_SIZE) / 2,
      left: (CONTENT_WIDTH - BURST_SIZE) / 2,
      width: BURST_SIZE,
      height: BURST_SIZE,
      alignItems: "center",
      justifyContent: "center",
      transform: "rotate(-8deg)",
    },
    h("img", {
      src: burstSvg(theme, BURST_SIZE),
      width: BURST_SIZE,
      height: BURST_SIZE,
      style: { position: "absolute", top: 0, left: 0 },
    }),
    div(
      {
        position: "relative",
        fontFamily: DISPLAY_FONT,
        fontSize: 70,
        color: theme.burstInk,
      },
      "VS",
    ),
  );
}

function scoreboard(battle: Battle, theme: Theme): Element {
  return panel(
    theme,
    {
      flexDirection: "column",
      justifyContent: "space-evenly",
      padding: "64px 28px 22px",
      flex: 1,
    },
    caption("THE SCOREBOARD", theme),
    ...battle.rounds.map((round) => roundRow(round, theme)),
  );
}

function roundRow(round: Round, theme: Theme): Element {
  const share = Math.min(1 - MIN_BAR_SHARE, Math.max(MIN_BAR_SHARE, round.shareA));
  return div(
    { flexDirection: "column", gap: 6 },
    div(
      { justifyContent: "space-between", alignItems: "flex-end", fontWeight: 700 },
      div({ fontFamily: DISPLAY_FONT, fontSize: 56 }, compact(round.a)),
      div(
        { fontFamily: DISPLAY_FONT, fontSize: 32, letterSpacing: 1 },
        `${round.label} · ${Math.round(round.weight * 100)}%`,
      ),
      div({ fontFamily: DISPLAY_FONT, fontSize: 56 }, compact(round.b)),
    ),
    div(
      { height: 46, border: `4px solid ${theme.ink}`, overflow: "hidden" },
      div({
        width: `${share * 100}%`,
        backgroundColor: theme.bars,
        borderRight: `4px solid ${theme.ink}`,
      }),
      div({ flex: 1, backgroundColor: theme.burst }),
    ),
  );
}

function verdict(battle: Battle, theme: Theme): Element {
  return div(
    {
      backgroundColor: theme.bubble,
      border: `${BORDER}px solid ${theme.ink}`,
      borderRadius: 36,
      padding: "18px 30px",
      fontSize: 34,
      fontWeight: 700,
      lineHeight: 1.25,
      justifyContent: "center",
    },
    `“${verdictLine(battle)}”`,
  );
}

function verdictLine(battle: Battle): string {
  const score = `${Math.max(battle.scoreA, battle.scoreB)} to ${Math.min(battle.scoreA, battle.scoreB)}`;
  if (battle.winner === "draw") return "A perfect draw! Nobody blinks.";
  const winner = battle.winner === "a" ? battle.a : battle.b;
  return `${truncate(winner.name, 30)} takes the issue, ${score}!`;
}

function footer(theme: Theme): Element {
  return div(
    { justifyContent: "space-between", alignItems: "center", gap: 12 },
    div(
      { fontSize: 18, fontWeight: 700, color: theme.ink },
      "Score = share of each metric, weighted. Formula in the README.",
    ),
    div(
      { fontFamily: DISPLAY_FONT, fontSize: 22, letterSpacing: 1, flexShrink: 0 },
      "MADE WITH REPOCOMIC",
    ),
  );
}
