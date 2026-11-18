import { contextBridge, ipcRenderer } from "electron"
import type { AiChunk, AiDone, BookshelfApi } from "../shared/types"

const api: BookshelfApi = {
	loadLibrary: () => ipcRenderer.invoke("data:load"),
	saveLibrary: (lib) => ipcRenderer.invoke("data:save", lib),
	pickCover: () => ipcRenderer.invoke("cover:pick"),
	exportLibrary: () => ipcRenderer.invoke("data:export"),
	importLibrary: () => ipcRenderer.invoke("data:import"),
	aiAsk: (req) => ipcRenderer.send("ai:ask", req),
	aiCancel: (id) => ipcRenderer.send("ai:cancel", id),
	aiCheck: (p) => ipcRenderer.invoke("ai:check", p),
	onAiChunk: (cb) => {
		const h = (_: unknown, c: AiChunk) => cb(c)
		ipcRenderer.on("ai:chunk", h)
		return () => ipcRenderer.removeListener("ai:chunk", h)
	},
	onAiDone: (cb) => {
		const h = (_: unknown, d: AiDone) => cb(d)
		ipcRenderer.on("ai:done", h)
		return () => ipcRenderer.removeListener("ai:done", h)
	},
	openExternal: (url) => ipcRenderer.send("shell:open", url),
	setTheme: (theme) => ipcRenderer.send("window:theme", theme),
}

contextBridge.exposeInMainWorld("api", api)
