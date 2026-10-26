export interface Theme {
  name: ThemeName;
  paper: string;
  ink: string;
  /** Cover background. */
  cover: string;
  /** Starburst and headline accents. */
  burst: string;
  burstInk: string;
  panel: string;
  bubble: string;
  /** Colour of the halftone dots printed over the cover. */
  dots: string;
  bars: string;
  /** Fallback colours for languages GitHub has no colour for. */
  palette: string[];
}

export type ThemeName = "classic" | "noir" | "pop";

export const THEMES: Record<ThemeName, Theme> = {
  classic: {
    name: "classic",
    paper: "#fdf3d7",
    ink: "#111111",
    cover: "#ffd23f",
    burst: "#e63946",
    burstInk: "#ffffff",
    panel: "#ffffff",
    bubble: "#ffffff",
    dots: "rgba(230, 57, 70, 0.28)",
    bars: "#1d6fd8",
    palette: ["#1d6fd8", "#e63946", "#2a9d8f", "#f4a261", "#8e44ad"],
  },
  noir: {
    name: "noir",
    paper: "#e9e9e6",
    ink: "#0b0b0b",
    cover: "#1b1b1b",
    burst: "#c1121f",
    burstInk: "#ffffff",
    panel: "#fafafa",
    bubble: "#ffffff",
    dots: "rgba(255, 255, 255, 0.14)",
    bars: "#1b1b1b",
    palette: ["#1b1b1b", "#555555", "#8a8a8a", "#b5b5b5", "#c1121f"],
  },
  pop: {
    name: "pop",
    paper: "#fff0f6",
    ink: "#14002b",
    cover: "#00c2d1",
    burst: "#ff2e88",
    burstInk: "#ffffff",
    panel: "#ffffff",
    bubble: "#fffbe6",
    dots: "rgba(20, 0, 43, 0.18)",
    bars: "#ff2e88",
    palette: ["#ff2e88", "#00c2d1", "#ffd000", "#7b2ff7", "#14002b"],
  },
};

export function isThemeName(value: string): value is ThemeName {
  return value in THEMES;
}

/** GitHub linguist colours for common languages. */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Dart: "#00B4AB",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Lua: "#000080",
  Zig: "#ec915c",
  "Jupyter Notebook": "#DA5B0B",
  Dockerfile: "#384d54",
  MDX: "#fcb32c",
};

export function languageColor(language: string, index: number, theme: Theme): string {
  if (theme.name !== "noir" && LANGUAGE_COLORS[language]) {
    return LANGUAGE_COLORS[language];
  }
  return theme.palette[index % theme.palette.length] ?? theme.ink;
}
