import c from "ansi-colors";
import { execa } from "execa";
import { writeFile } from "fs-extra";
import path from "node:path";
import tmp from "tmp-promise";
import { expect } from "vitest";
import { type Adapter } from "./adapters.js";
import { testDebug } from "./debug.js";

const debugScriptRun = testDebug.extend("runSeedScript");
const debugScriptOutput = debugScriptRun.extend("output");

interface RunScriptProps {
  adapter: Adapter;
  connectionString: string;
  cwd?: string;
  env?: Record<string, string>;
  generateOutputIndexPath?: string;
  script: string;
}

let scriptId = 0;

export const runSeedScript = async ({
  script: inputScript,
  generateOutputIndexPath,
  cwd,
  env = {},
}: RunScriptProps) => {
  const script = [inputScript, 'await (await import("#seed")).end()'].join(
    "\n",
  );

  cwd ??= (await tmp.dir()).path;
  generateOutputIndexPath ??= "./__generateOutput/index.js";

  debugScriptRun(
    [
      "",
      "==================================",
      c.bold("Running script:"),
      `${c.bold("test:")} ${expect.getState().currentTestName}`,
      `${c.bold("script:")} ${script}`,
      "==================================",
      "",
    ].join("\n"),
  );

  const scriptName = `script${++scriptId}`;
  const scriptFilename = `${scriptName}.mts`;

  const scriptPath = path.join(cwd, scriptFilename);
  await writeFile(scriptPath, script);

  const typecheckResult = execa(
    "tsc",
    ["--project", path.join(cwd, "tsconfig.json")],
    {
      stderr: "pipe",
      stdout: "pipe",
      extendEnv: true,
      cwd,
      env: {
        DEBUG_COLORS: "1",
        ...env,
      },
    },
  );
  typecheckResult.stdout?.on("data", (chunk: Buffer) => {
    debugScriptOutput(chunk.toString().trim());
  });
  typecheckResult.stderr?.on("data", (chunk: Buffer) => {
    debugScriptOutput(chunk.toString().trim());
  });
  await typecheckResult;

  const result = execa("tsx", ["--conditions=development", scriptPath], {
    stderr: "pipe",
    stdout: "pipe",
    extendEnv: true,
    env: {
      DEBUG_COLORS: "1",
      ...env,
    },
  });
  result.stdout?.on("data", (chunk: Buffer) => {
    debugScriptOutput(chunk.toString().trim());
  });
  result.stderr?.on("data", (chunk: Buffer) => {
    debugScriptOutput(chunk.toString().trim());
  });

  return result;
};
