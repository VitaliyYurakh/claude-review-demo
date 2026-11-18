import { type ChildProcess, spawn } from "node:child_process"
import { promises as fs } from "node:fs"
import { join } from "node:path"
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron"
import { type AiRequest, emptyLibrary, type Library } from "../shared/types"

const dataFile = () => join(app.getPath("userData"), "library.json")
const coversDir = () => join(app.getPath("userData"), "covers")

async function loadLibrary(): Promise<Library> {
	try {
		const raw = await fs.readFile(dataFile(), "utf8")
		return { ...emptyLibrary(), ...JSON.parse(raw) }
	} catch {
		return emptyLibrary()
	}
}

async function saveLibrary(lib: Library) {
	const tmp = `${dataFile()}.${process.pid}.${Date.now()}.tmp`
	await fs.writeFile(tmp, JSON.stringify(lib, null, 2), "utf8")
	await fs.rename(tmp, dataFile())
}

function createWindow() {
	const win = new BrowserWindow({
		width: 1280,
		height: 820,
		minWidth: 960,
		minHeight: 640,
		show: false,
		autoHideMenuBar: true,
		backgroundColor: "#0f0f13",
		titleBarStyle: "hidden",
		titleBarOverlay: { color: "#0f0f13", symbolColor: "#a1a1aa", height: 40 },
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	})
	win.once("ready-to-show", () => win.show())
	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url)
		return { action: "deny" }
	})
	if (process.env.ELECTRON_RENDERER_URL) {
		win.loadURL(process.env.ELECTRON_RENDERER_URL)
	} else {
		win.loadFile(join(__dirname, "../renderer/index.html"))
	}
}

const aiProcesses = new Map<string, ChildProcess>()

interface StreamEvent {
	type?: string
	result?: unknown
	event?: { type?: string; delta?: { type?: string; text?: string } }
}

const errorMessage = (err: unknown) =>
	err instanceof Error ? err.message : String(err)

function spawnClaude(claudePath: string, args: string[]) {
	const opts = {
		windowsHide: true,
		cwd: app.getPath("userData"),
		env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" },
	}
	if (process.platform !== "win32") return spawn(claudePath, args, opts)
	const cmdline = `"${claudePath}" ${args.join(" ")}`
	return spawn(
		process.env.ComSpec || "cmd.exe",
		["/d", "/s", "/c", `"${cmdline}"`],
		{
			...opts,
			windowsVerbatimArguments: true,
		},
	)
}

function killTree(p: ChildProcess) {
	if (process.platform === "win32" && p.pid) {
		spawn("taskkill", ["/pid", String(p.pid), "/T", "/F"], {
			windowsHide: true,
		})
	} else {
		p.kill()
	}
}

function registerIpc() {
	ipcMain.handle("data:load", () => loadLibrary())
	ipcMain.handle("data:save", (_e, lib: Library) => saveLibrary(lib))

	ipcMain.handle("cover:pick", async () => {
		const r = await dialog.showOpenDialog({
			properties: ["openFile"],
			filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
		})
		if (r.canceled || !r.filePaths[0]) return null
		await fs.mkdir(coversDir(), { recursive: true })
		const src = r.filePaths[0]
		const ext = src.split(".").pop()?.toLowerCase() ?? "png"
		const dest = join(coversDir(), `${Date.now()}.${ext}`)
		await fs.copyFile(src, dest)
		const buf = await fs.readFile(dest)
		return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${buf.toString("base64")}`
	})

	ipcMain.handle("data:export", async () => {
		const r = await dialog.showSaveDialog({
			defaultPath: "bookshelf-backup.json",
			filters: [{ name: "JSON", extensions: ["json"] }],
		})
		if (r.canceled || !r.filePath) return false
		await saveLibrary(await loadLibrary())
		await fs.copyFile(dataFile(), r.filePath)
		return true
	})

	ipcMain.handle("data:import", async () => {
		const r = await dialog.showOpenDialog({
			properties: ["openFile"],
			filters: [{ name: "JSON", extensions: ["json"] }],
		})
		if (r.canceled || !r.filePaths[0]) return null
		try {
			const raw = await fs.readFile(r.filePaths[0], "utf8")
			const lib = { ...emptyLibrary(), ...JSON.parse(raw) } as Library
			await saveLibrary(lib)
			return lib
		} catch {
			return null
		}
	})

	ipcMain.handle("ai:check", async (_e, claudePath: string) => {
		return await new Promise((resolve) => {
			let out = ""
			try {
				const p = spawnClaude(claudePath, ["--version"])
				p.stdout?.on("data", (d) => (out += d))
				p.on("error", (err) => resolve({ ok: false, error: err.message }))
				p.on("close", (code) =>
					resolve(
						code === 0
							? { ok: true, version: out.trim() }
							: { ok: false, error: `exit ${code}` },
					),
				)
			} catch (err) {
				resolve({ ok: false, error: errorMessage(err) })
			}
		})
	})

	ipcMain.on("ai:ask", async (e, req: AiRequest) => {
		const lib = await loadLibrary()
		const args = req.json
			? ["-p", "--output-format", "json"]
			: [
					"-p",
					"--output-format",
					"stream-json",
					"--verbose",
					"--include-partial-messages",
				]
		let full = ""
		let buffer = ""
		let stderr = ""
		const send = (channel: string, payload: unknown) => {
			if (!e.sender.isDestroyed()) e.sender.send(channel, payload)
		}
		let p: ChildProcess
		try {
			p = spawnClaude(lib.settings.claudePath, args)
		} catch (err) {
			send("ai:done", {
				requestId: req.requestId,
				ok: false,
				error: errorMessage(err),
				full: "",
			})
			return
		}
		aiProcesses.set(req.requestId, p)
		p.stdin?.on("error", () => {})
		p.stdin?.write(req.prompt)
		p.stdin?.end()
		p.stderr?.on("data", (d) => (stderr += d))

		p.stdout?.on("data", (d) => {
			if (req.json) {
				full += d.toString()
				return
			}
			buffer += d.toString()
			const lines = buffer.split("\n")
			buffer = lines.pop() ?? ""
			for (const line of lines) {
				if (!line.trim()) continue
				let ev: StreamEvent
				try {
					ev = JSON.parse(line)
				} catch {
					continue
				}
				if (
					ev.type === "stream_event" &&
					ev.event?.type === "content_block_delta" &&
					ev.event.delta?.type === "text_delta"
				) {
					full += ev.event.delta.text
					send("ai:chunk", {
						requestId: req.requestId,
						text: ev.event.delta.text,
					})
				} else if (
					ev.type === "result" &&
					!full &&
					typeof ev.result === "string"
				) {
					full = ev.result
					send("ai:chunk", { requestId: req.requestId, text: ev.result })
				}
			}
		})

		p.on("error", (err) => {
			aiProcesses.delete(req.requestId)
			send("ai:done", {
				requestId: req.requestId,
				ok: false,
				error: err.message,
				full,
			})
		})
		p.on("close", (code) => {
			aiProcesses.delete(req.requestId)
			if (req.json) {
				try {
					const parsed = JSON.parse(full)
					if (typeof parsed.result === "string") full = parsed.result
				} catch {
					/* сирий текст лишається як є */
				}
			}
			send("ai:done", {
				requestId: req.requestId,
				ok: code === 0,
				error: code === 0 ? undefined : stderr.trim() || `exit ${code}`,
				full,
			})
		})
	})

	ipcMain.on("ai:cancel", (_e, requestId: string) => {
		const p = aiProcesses.get(requestId)
		if (p) killTree(p)
		aiProcesses.delete(requestId)
	})

	ipcMain.on("window:theme", (e, theme: "dark" | "light") => {
		const win = BrowserWindow.fromWebContents(e.sender)
		win?.setTitleBarOverlay(
			theme === "dark"
				? { color: "#0f0f13", symbolColor: "#a1a1aa" }
				: { color: "#f6f3ee", symbolColor: "#57534e" },
		)
	})

	ipcMain.on("shell:open", (_e, url: string) => {
		if (/^https?:\/\//.test(url)) shell.openExternal(url)
	})
}

app.whenReady().then(() => {
	registerIpc()
	createWindow()
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit()
})
