let raw = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => {
	raw += chunk
})
process.stdin.on("end", () => {
	const { model, cost, context_window: context } = JSON.parse(raw)
	const usd = (cost?.total_cost_usd ?? 0).toFixed(2)
	const tokens = Math.round((context?.total_input_tokens ?? 0) / 1000)
	const percent = Math.round(context?.used_percentage ?? 0)
	process.stdout.write(`[${model.display_name}] $${usd} | ctx ${tokens}k (${percent}%)`)
})
