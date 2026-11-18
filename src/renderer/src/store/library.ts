import type {
	AiNote,
	Book,
	Library,
	Note,
	Reading,
	ReadingStatus,
	Roadmap,
	Settings,
	Stage,
} from "@shared/types"
import { emptyLibrary } from "@shared/types"
import { create } from "zustand"

export const uid = () =>
	Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
export const today = () => new Date().toISOString().slice(0, 10)

interface State extends Library {
	loaded: boolean
	load: () => Promise<void>
	replace: (lib: Library) => void

	addBook: (b: Omit<Book, "id" | "createdAt">, status?: ReadingStatus) => Book
	updateBook: (id: string, patch: Partial<Book>) => void
	removeBook: (id: string) => void

	readingFor: (bookId: string) => Reading | undefined
	updateReading: (bookId: string, patch: Partial<Reading>) => void
	setStatus: (bookId: string, status: ReadingStatus) => void
	reorderPlanned: (ids: string[]) => void
	addQuote: (bookId: string, q: string) => void
	removeQuote: (bookId: string, idx: number) => void
	addAiNote: (bookId: string, note: Omit<AiNote, "id" | "createdAt">) => void
	removeAiNote: (bookId: string, noteId: string) => void

	addRoadmap: (r: Omit<Roadmap, "id" | "createdAt" | "stages">) => Roadmap
	updateRoadmap: (id: string, patch: Partial<Roadmap>) => void
	removeRoadmap: (id: string) => void
	addStage: (roadmapId: string, s: Omit<Stage, "id" | "bookIds">) => void
	updateStage: (
		roadmapId: string,
		stageId: string,
		patch: Partial<Stage>,
	) => void
	removeStage: (roadmapId: string, stageId: string) => void
	moveStage: (roadmapId: string, from: number, to: number) => void
	moveBookInRoadmap: (
		roadmapId: string,
		bookId: string,
		toStageId: string,
		toIndex: number,
	) => void

	addNote: (n: Omit<Note, "id" | "createdAt">) => Note
	updateNote: (id: string, patch: Partial<Note>) => void
	removeNote: (id: string) => void

	updateSettings: (patch: Partial<Settings>) => void
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
const persist = (get: () => State) => {
	clearTimeout(saveTimer)
	saveTimer = setTimeout(() => {
		const { books, readings, roadmaps, notes, settings } = get()
		window.api.saveLibrary({
			version: 1,
			books,
			readings,
			roadmaps,
			notes,
			settings,
		})
	}, 300)
}

export const useLibrary = create<State>((set, get) => {
	const mutate = (fn: (s: State) => Partial<State>) => {
		set(fn)
		persist(get)
	}
	const patchReading = (bookId: string, fn: (r: Reading) => Reading) =>
		mutate((s) => ({
			readings: s.readings.map((r) => (r.bookId === bookId ? fn(r) : r)),
		}))
	const patchRoadmap = (id: string, fn: (r: Roadmap) => Roadmap) =>
		mutate((s) => ({
			roadmaps: s.roadmaps.map((r) => (r.id === id ? fn(r) : r)),
		}))

	return {
		...emptyLibrary(),
		loaded: false,

		load: async () => {
			const lib = await window.api.loadLibrary()
			set({ ...lib, loaded: true })
		},
		replace: (lib) => mutate(() => ({ ...lib })),

		addBook: (b, status = "planned") => {
			const book: Book = {
				...b,
				id: uid(),
				createdAt: new Date().toISOString(),
			}
			const maxOrder = Math.max(0, ...get().readings.map((r) => r.order))
			const reading: Reading = {
				id: uid(),
				bookId: book.id,
				status,
				order: maxOrder + 1,
				quotes: [],
				aiNotes: [],
				startedAt: status === "reading" ? today() : undefined,
				finishedAt: status === "done" ? today() : undefined,
			}
			mutate((s) => ({
				books: [...s.books, book],
				readings: [...s.readings, reading],
			}))
			return book
		},
		updateBook: (id, patch) =>
			mutate((s) => ({
				books: s.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
			})),
		removeBook: (id) =>
			mutate((s) => ({
				books: s.books.filter((b) => b.id !== id),
				readings: s.readings.filter((r) => r.bookId !== id),
				roadmaps: s.roadmaps.map((r) => ({
					...r,
					stages: r.stages.map((st) => ({
						...st,
						bookIds: st.bookIds.filter((x) => x !== id),
					})),
				})),
			})),

		readingFor: (bookId) => get().readings.find((r) => r.bookId === bookId),
		updateReading: (bookId, patch) =>
			patchReading(bookId, (r) => ({ ...r, ...patch })),
		setStatus: (bookId, status) =>
			patchReading(bookId, (r) => ({
				...r,
				status,
				startedAt: status === "reading" && !r.startedAt ? today() : r.startedAt,
				finishedAt:
					status === "done"
						? (r.finishedAt ?? today())
						: status === "planned"
							? undefined
							: r.finishedAt,
			})),
		reorderPlanned: (ids) =>
			mutate((s) => ({
				readings: s.readings.map((r) => {
					const i = ids.indexOf(r.bookId)
					return i === -1 ? r : { ...r, order: i + 1 }
				}),
			})),
		addQuote: (bookId, q) =>
			patchReading(bookId, (r) => ({ ...r, quotes: [...r.quotes, q] })),
		removeQuote: (bookId, idx) =>
			patchReading(bookId, (r) => ({
				...r,
				quotes: r.quotes.filter((_, i) => i !== idx),
			})),
		addAiNote: (bookId, note) =>
			patchReading(bookId, (r) => ({
				...r,
				aiNotes: [
					{ ...note, id: uid(), createdAt: new Date().toISOString() },
					...r.aiNotes,
				],
			})),
		removeAiNote: (bookId, noteId) =>
			patchReading(bookId, (r) => ({
				...r,
				aiNotes: r.aiNotes.filter((n) => n.id !== noteId),
			})),

		addRoadmap: (r) => {
			const roadmap: Roadmap = {
				...r,
				id: uid(),
				stages: [],
				createdAt: new Date().toISOString(),
			}
			mutate((s) => ({ roadmaps: [...s.roadmaps, roadmap] }))
			return roadmap
		},
		updateRoadmap: (id, patch) => patchRoadmap(id, (r) => ({ ...r, ...patch })),
		removeRoadmap: (id) =>
			mutate((s) => ({ roadmaps: s.roadmaps.filter((r) => r.id !== id) })),
		addStage: (roadmapId, st) =>
			patchRoadmap(roadmapId, (r) => ({
				...r,
				stages: [...r.stages, { ...st, id: uid(), bookIds: [] }],
			})),
		updateStage: (roadmapId, stageId, patch) =>
			patchRoadmap(roadmapId, (r) => ({
				...r,
				stages: r.stages.map((s) =>
					s.id === stageId ? { ...s, ...patch } : s,
				),
			})),
		removeStage: (roadmapId, stageId) =>
			patchRoadmap(roadmapId, (r) => ({
				...r,
				stages: r.stages.filter((s) => s.id !== stageId),
			})),
		moveStage: (roadmapId, from, to) =>
			patchRoadmap(roadmapId, (r) => {
				const stages = [...r.stages]
				const [item] = stages.splice(from, 1)
				stages.splice(to, 0, item)
				return { ...r, stages }
			}),
		moveBookInRoadmap: (roadmapId, bookId, toStageId, toIndex) =>
			patchRoadmap(roadmapId, (r) => ({
				...r,
				stages: r.stages.map((s) => {
					const without = s.bookIds.filter((id) => id !== bookId)
					if (s.id !== toStageId) return { ...s, bookIds: without }
					const next = [...without]
					next.splice(Math.min(toIndex, next.length), 0, bookId)
					return { ...s, bookIds: next }
				}),
			})),

		addNote: (n) => {
			const note: Note = {
				...n,
				id: uid(),
				createdAt: new Date().toISOString(),
			}
			mutate((s) => ({ notes: [note, ...s.notes] }))
			return note
		},
		updateNote: (id, patch) =>
			mutate((s) => ({
				notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
			})),
		removeNote: (id) =>
			mutate((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

		updateSettings: (patch) =>
			mutate((s) => ({ settings: { ...s.settings, ...patch } })),
	}
})

export const statusLabel: Record<ReadingStatus, string> = {
	planned: "У планах",
	reading: "Читаю",
	done: "Прочитано",
	dropped: "Покинуто",
}
