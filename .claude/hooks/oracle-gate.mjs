import { spawnSync } from "node:child_process";
import { join } from "node:path";

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const bin = (...parts) => join(projectDir, "node_modules", ...parts);

const checks = [
	{ name: "tsc --noEmit", args: [bin("typescript", "bin", "tsc"), "--noEmit"] },
	{ name: "biome check src", args: [bin("@biomejs", "biome", "bin", "biome"), "check", "src"] },
];

const failures = checks
	.map(({ name, args }) => {
		const result = spawnSync(process.execPath, args, { cwd: projectDir, encoding: "utf8" });
		return { name, status: result.status, output: `${result.stdout}${result.stderr}`.trim() };
	})
	.filter((check) => check.status !== 0);

// No stop_hook_active early exit: the gate must keep blocking while the oracle fails.
// Claude Code's own block cap (8 in a row without a tool call) prevents an endless loop.
if (failures.length > 0) {
	const report = failures.map((f) => `${f.name} -> exit ${f.status}\n${f.output.slice(0, 4000)}`).join("\n\n");
	process.stdout.write(
		JSON.stringify({
			decision: "block",
			reason: `Oracle failed, the task is not done. Fix these errors, then finish:\n\n${report}`,
		}),
	);
}
