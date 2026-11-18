export type ReadingStatus = "planned" | "reading" | "done" | "dropped"

export interface Book {
	id: string
	title: string
	author: string
	pages: number
	genre?: string
	cover?: string
	description?: string
	createdAt: string
}

export interface AiNote {
	id: string
	kind: "review" | "summary" | "similar" | "worth" | "custom" | "next"
	prompt: string
	answer: string
	createdAt: string
}

export interface Reading {
	id: string
	bookId: string
	status: ReadingStatus
	order: number
	startedAt?: string
	finishedAt?: string
	currentPage?: number
	rating?: number
	review?: string
	quotes: string[]
	aiNotes: AiNote[]
}

export interface Note {
	id: string
	title: string
	author?: string
	category: string
	text?: string
	createdAt: string
}

export interface Stage {
	id: string
	title: string
	bookIds: string[]
	targetDate?: string
}

export interface Roadmap {
	id: string
	title: string
	description?: string
	stages: Stage[]
	createdAt: string
}

export interface Settings {
	yearlyGoal: number
	theme: "dark" | "light"
	claudePath: string
}

export interface Library {
	version: 1
	books: Book[]
	readings: Reading[]
	roadmaps: Roadmap[]
	notes: Note[]
	settings: Settings
}

export const emptyLibrary = (): Library => ({
	version: 1,
	books: [],
	readings: [],
	roadmaps: [],
	notes: [],
	settings: { yearlyGoal: 24, theme: "dark", claudePath: "claude" },
})

export interface AiRequest {
	requestId: string
	prompt: string
	json?: boolean
}

export interface AiChunk {
	requestId: string
	text: string
}

export interface AiDone {
	requestId: string
	ok: boolean
	error?: string
	full: string
}

export interface BookshelfApi {
	loadLibrary: () => Promise<Library>
	saveLibrary: (lib: Library) => Promise<void>
	pickCover: () => Promise<string | null>
	exportLibrary: () => Promise<boolean>
	importLibrary: () => Promise<Library | null>
	aiAsk: (req: AiRequest) => void
	aiCancel: (requestId: string) => void
	aiCheck: (
		claudePath: string,
	) => Promise<{ ok: boolean; version?: string; error?: string }>
	onAiChunk: (cb: (c: AiChunk) => void) => () => void
	onAiDone: (cb: (d: AiDone) => void) => () => void
	openExternal: (url: string) => void
	setTheme: (theme: "dark" | "light") => void
}
