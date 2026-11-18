import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { join } from "node:path";

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const biome = join(
    projectDir,
    "node_modules",
    "@biomejs",
    "biome",
    "bin",
    "biome",
);
const logFile = join(projectDir, ".claude", "hooks", "biome-check.log");

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
    raw += chunk;
});
process.stdin.on("end", () => {
    const input = JSON.parse(raw);
    const file = input.tool_input?.file_path;
    if (!file) return;

    const result = spawnSync(
        process.execPath,
        [biome, "check", "--write", "--no-errors-on-unmatched", file],
        { cwd: projectDir, encoding: "utf8" },
    );
    const output = `${result.stdout}${result.stderr}`.trim();
    appendFileSync(
        logFile,
        `[${new Date().toISOString()}] ${input.tool_name} ${file} -> exit ${result.status}\n${output}\n\n`,
    );

    if (result.status !== 0) {
        process.stderr.write(output);
        process.exit(2);
    }
});
