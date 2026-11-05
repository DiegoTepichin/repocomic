import { readFile, writeFile } from "node:fs/promises";
import { Command, InvalidArgumentError, Option } from "commander";
import { fight } from "./battle.js";
import { type Fetch, fetchRepoStats } from "./github.js";
import { type FormatName, isFormatName } from "./layout.js";
import { renderBattlePng, renderBattleSvg, renderPng, renderSvg } from "./render.js";
import { parseRepoStats, type RepoStats, StatsError } from "./stats.js";
import { isThemeName, type ThemeName } from "./themes.js";
import { VERSION } from "./version.js";

export interface CliIO {
  fetch?: Fetch;
  env?: Record<string, string | undefined>;
  log?: (message: string) => void;
  error?: (message: string) => void;
}

interface Options {
  output?: string;
  theme: ThemeName;
  format: FormatName;
  fromJson?: string;
  saveJson?: string;
  offline?: boolean;
}

export async function main(argv: string[], io: CliIO = {}): Promise<number> {
  const log = io.log ?? ((message: string) => console.log(message));
  const error = io.error ?? ((message: string) => console.error(message));
  const env = io.env ?? process.env;
  if (argv[0] === "battle") return battle(argv.slice(1), { ...io, log, error, env });
  const program = buildProgram();
  program.exitOverride();
  program.configureOutput({ writeOut: log, writeErr: error });
  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (exc) {
    if (isCommanderExit(exc)) return exc.exitCode;
    throw exc;
  }
  const [repo] = program.args;
  const options = program.opts<Options>();
  try {
    const stats = await loadStats(repo, options, env, io.fetch);
    if (options.saveJson) {
      await writeFile(options.saveJson, `${JSON.stringify(stats, null, 2)}\n`);
      log(`saved stats to ${options.saveJson}`);
    }
    const output = options.output ?? `${stats.name}-${options.format}.png`;
    const renderOptions = {
      theme: options.theme,
      format: options.format,
      offline: options.offline === true,
      ...(io.fetch ? { fetch: io.fetch } : {}),
    };
    const image = output.toLowerCase().endsWith(".svg")
      ? await renderSvg(stats, renderOptions)
      : await renderPng(stats, renderOptions);
    await writeFile(output, image);
    log(`wrote ${output}`);
    return 0;
  } catch (exc) {
    if (exc instanceof StatsError || isNodeError(exc)) {
      error(`error: ${exc.message}`);
      return 1;
    }
    throw exc;
  }
}

interface BattleOptions {
  output?: string;
  theme: ThemeName;
}

type ResolvedIO = CliIO & Required<Pick<CliIO, "log" | "error" | "env">>;

async function battle(args: string[], io: ResolvedIO): Promise<number> {
  const program = buildBattleProgram();
  program.exitOverride();
  program.configureOutput({ writeOut: io.log, writeErr: io.error });
  try {
    await program.parseAsync(args, { from: "user" });
  } catch (exc) {
    if (isCommanderExit(exc)) return exc.exitCode;
    throw exc;
  }
  const [first, second] = program.processedArgs as [string, string];
  const options = program.opts<BattleOptions>();
  try {
    const token = io.env.GITHUB_TOKEN ?? io.env.GH_TOKEN;
    const github = { token, ...(io.fetch ? { fetch: io.fetch } : {}) };
    const [a, b] = await Promise.all([
      fetchRepoStats(first, github),
      fetchRepoStats(second, github),
    ]);
    const result = fight(a, b);
    const output = options.output ?? `${a.name}-vs-${b.name}.png`;
    const image = output.toLowerCase().endsWith(".svg")
      ? await renderBattleSvg(result, { theme: options.theme })
      : await renderBattlePng(result, { theme: options.theme });
    await writeFile(output, image);
    io.log(`wrote ${output}`);
    return 0;
  } catch (exc) {
    if (exc instanceof StatsError || isNodeError(exc)) {
      io.error(`error: ${exc.message}`);
      return 1;
    }
    throw exc;
  }
}

function buildBattleProgram(): Command {
  return new Command()
    .name("repocomic battle")
    .description("Put two GitHub repositories head to head on a versus poster.")
    .argument("<repo-a>", "owner/repo or a github.com URL")
    .argument("<repo-b>", "owner/repo or a github.com URL")
    .option("-o, --output <file>", "output file; .png (default) or .svg")
    .addOption(themeOption())
    .addHelpText("after", "\nSet GITHUB_TOKEN to raise the GitHub API rate limit.");
}

function themeOption(): Option {
  return new Option("-t, --theme <name>", "colour theme")
    .choices(["classic", "noir", "pop"])
    .default("classic")
    .argParser(oneOf(isThemeName));
}

function buildProgram(): Command {
  return new Command()
    .name("repocomic")
    .description("Turn a GitHub repository into a comic-book poster.")
    .version(VERSION)
    .argument("[repo]", "owner/repo or a github.com URL")
    .option("-o, --output <file>", "output file; .png (default) or .svg")
    .addOption(themeOption())
    .addOption(
      new Option("-f, --format <name>", "poster 1080x1350 or card 1200x630")
        .choices(["poster", "card"])
        .default("poster")
        .argParser(oneOf(isFormatName)),
    )
    .option("--from-json <file>", "render saved stats instead of calling GitHub")
    .option("--save-json <file>", "also save the fetched stats as JSON")
    .option("--offline", "do not download contributor avatars")
    .addHelpText(
      "after",
      "\nSet GITHUB_TOKEN to raise the GitHub API rate limit.\nRun `repocomic battle --help` to compare two repositories.",
    );
}

async function loadStats(
  repo: string | undefined,
  options: Options,
  env: Record<string, string | undefined>,
  fetcher: Fetch | undefined,
): Promise<RepoStats> {
  if (options.fromJson) {
    const text = await readFile(options.fromJson, "utf8");
    try {
      return parseRepoStats(JSON.parse(text));
    } catch (exc) {
      if (exc instanceof SyntaxError) throw new StatsError(`${options.fromJson} is not valid JSON`);
      throw exc;
    }
  }
  if (!repo) throw new StatsError("give a repository (owner/repo) or --from-json <file>");
  return fetchRepoStats(repo, {
    token: env.GITHUB_TOKEN ?? env.GH_TOKEN,
    ...(fetcher ? { fetch: fetcher } : {}),
  });
}

function oneOf<T extends string>(guard: (value: string) => value is T): (value: string) => T {
  return (value) => {
    if (!guard(value)) throw new InvalidArgumentError(`unknown value "${value}"`);
    return value;
  };
}

function isCommanderExit(exc: unknown): exc is { exitCode: number } {
  return typeof exc === "object" && exc !== null && "exitCode" in exc && "code" in exc;
}

function isNodeError(exc: unknown): exc is NodeJS.ErrnoException {
  return exc instanceof Error && "code" in exc;
}
