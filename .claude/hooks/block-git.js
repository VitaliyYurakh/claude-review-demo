const GIT_CALL = /(^|[^\w.-])git(\.exe)?(?=$|[\s"'`;|&)])/i

let raw = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => (raw += chunk))
process.stdin.on("end", () => {
	const command = JSON.parse(raw).tool_input?.command ?? ""
	if (GIT_CALL.test(command)) {
		console.error(
			"Blocked: git is not allowed in this project, including through launchers such as npx.",
		)
		process.exit(2)
	}
})
