import { execFile } from "node:child_process"
import { createInterface } from "node:readline"

const REVISION = /^[\w./~^@{}-]+(\.\.\.?[\w./~^@{}-]+)?$/

const GIT_DIFF_TOOL = {
	name: "git_diff",
	description:
		"Show the git diff of the project. Without arguments returns staged and unstaged changes against HEAD.",
	inputSchema: {
		type: "object",
		properties: {
			revision: {
				type: "string",
				description: 'A revision or range, e.g. "HEAD", "main...HEAD", "abc123..def456". Default: "HEAD".',
			},
			paths: {
				type: "array",
				items: { type: "string" },
				description: "Limit the diff to these files or folders.",
			},
		},
		additionalProperties: false,
	},
}

function validate({ revision = "HEAD", paths = [] }) {
	if (revision.startsWith("-") || !REVISION.test(revision)) {
		throw new Error(`Invalid revision: ${revision}`)
	}
	const badPath = paths.find((path) => path.startsWith("-"))
	if (badPath !== undefined) {
		throw new Error(`Invalid path: ${badPath}`)
	}
	return { revision, paths }
}

// Arguments are passed as argv without a shell, so nothing can be chained or redirected.
function gitDiff(args) {
	const { revision, paths } = validate(args)
	const argv = ["--no-pager", "diff", "--no-ext-diff", "--no-textconv", revision, "--", ...paths]
	return new Promise((resolve, reject) => {
		execFile("git", argv, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
			if (error) {
				reject(new Error(stderr || error.message))
				return
			}
			resolve(stdout || "No changes.")
		})
	})
}

async function callTool({ name, arguments: args = {} }) {
	if (name !== GIT_DIFF_TOOL.name) {
		throw new Error(`Unknown tool: ${name}`)
	}
	try {
		return { content: [{ type: "text", text: await gitDiff(args) }] }
	} catch (error) {
		return { content: [{ type: "text", text: error.message }], isError: true }
	}
}

const handlers = {
	initialize: ({ protocolVersion }) => ({
		protocolVersion,
		capabilities: { tools: {} },
		serverInfo: { name: "review", version: "1.0.0" },
	}),
	ping: () => ({}),
	"tools/list": () => ({ tools: [GIT_DIFF_TOOL] }),
	"tools/call": callTool,
}

function send(message) {
	process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`)
}

createInterface({ input: process.stdin }).on("line", async (line) => {
	if (!line.trim()) return
	const { id, method, params = {} } = JSON.parse(line)
	if (id === undefined) return
	const handler = handlers[method]
	if (!handler) {
		send({ id, error: { code: -32601, message: `Method not found: ${method}` } })
		return
	}
	send({ id, result: await handler(params) })
})
