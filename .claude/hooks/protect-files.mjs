import { relative, resolve } from "node:path"

const PROTECTED = {
	"electron-builder.yml":
		"release build config: change it only by hand after agreeing with the team",
	".claude/settings.json":
		"Claude's own permissions and hooks: the agent must not change its limits",
}

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

const normalize = (p) => {
	const rel = relative(projectDir, resolve(projectDir, p)).replaceAll("\\", "/")
	return process.platform === "win32" ? rel.toLowerCase() : rel
}

let raw = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => {
	raw += chunk
})
process.stdin.on("end", () => {
	const input = JSON.parse(raw)
	const file = input.tool_input?.file_path
	if (!file) return

	const target = normalize(file)
	const match = Object.keys(PROTECTED).find((p) => normalize(p) === target)
	if (!match) return

	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: `${match} is protected by the project hook: ${PROTECTED[match]}. Do not try to write it another way; tell the user what change is needed.`,
			},
		}),
	)
})
