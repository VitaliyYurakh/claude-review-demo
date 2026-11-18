import { AnimatePresence, motion } from "framer-motion"
import {
	BarChart3,
	BookOpen,
	Library,
	ListTodo,
	Map as MapIcon,
	NotebookPen,
	Settings,
	Sparkles,
} from "lucide-react"
import { type ReactElement, useEffect, useState } from "react"
import BookModal from "@/components/BookModal"
import { cx } from "@/components/ui"
import LibraryPage from "@/pages/LibraryPage"
import NotesPage from "@/pages/NotesPage"
import PlansPage from "@/pages/PlansPage"
import ReadingPage from "@/pages/ReadingPage"
import RoadmapsPage from "@/pages/RoadmapsPage"
import SettingsPage from "@/pages/SettingsPage"
import StatsPage from "@/pages/StatsPage"
import { useLibrary } from "@/store/library"

export type Page =
	| "library"
	| "reading"
	| "plans"
	| "roadmaps"
	| "notes"
	| "stats"
	| "settings"

const nav: { id: Page; label: string; icon: typeof Library }[] = [
	{ id: "library", label: "Бібліотека", icon: Library },
	{ id: "reading", label: "Читаю", icon: BookOpen },
	{ id: "plans", label: "Плани", icon: ListTodo },
	{ id: "roadmaps", label: "Роудмапи", icon: MapIcon },
	{ id: "notes", label: "Нотатки", icon: NotebookPen },
	{ id: "stats", label: "Статистика", icon: BarChart3 },
	{ id: "settings", label: "Налаштування", icon: Settings },
]

export default function App() {
	const [page, setPage] = useState<Page>("library")
	const [openBook, setOpenBook] = useState<string | null>(null)
	const loaded = useLibrary((s) => s.loaded)
	const theme = useLibrary((s) => s.settings.theme)
	const load = useLibrary((s) => s.load)
	const reading = useLibrary(
		(s) => s.readings.filter((r) => r.status === "reading").length,
	)

	useEffect(() => {
		load()
	}, [load])
	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark")
		window.api.setTheme(theme)
	}, [theme])

	if (!loaded)
		return (
			<div className="h-full flex items-center justify-center text-ink-3">
				<Sparkles className="animate-pulse" />
			</div>
		)

	const pages: Record<Page, ReactElement> = {
		library: <LibraryPage onOpen={setOpenBook} />,
		reading: <ReadingPage onOpen={setOpenBook} />,
		plans: <PlansPage onOpen={setOpenBook} />,
		roadmaps: <RoadmapsPage onOpen={setOpenBook} />,
		notes: <NotesPage />,
		stats: <StatsPage onOpen={setOpenBook} />,
		settings: <SettingsPage />,
	}

	return (
		<div className="h-full flex">
			<aside className="w-56 shrink-0 bg-bg-soft border-r border-line flex flex-col drag-region">
				<div className="h-10" />
				<div className="px-5 pb-6 pt-2">
					<div className="font-serif text-xl font-semibold tracking-tight">
						Bookshelf
					</div>
					<div className="text-[11px] text-ink-3 mt-0.5">особиста читальня</div>
				</div>
				<nav className="flex-1 px-3 space-y-0.5 no-drag">
					{nav.map(({ id, label, icon: Icon }) => (
						<button
							type="button"
							key={id}
							onClick={() => setPage(id)}
							className={cx(
								"w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition relative",
								page === id
									? "text-ink"
									: "text-ink-2 hover:text-ink hover:bg-panel-2/60",
							)}
						>
							{page === id && (
								<motion.span
									layoutId="nav-active"
									className="absolute inset-0 bg-panel rounded-lg shadow-sm border border-line"
								/>
							)}
							<Icon
								size={17}
								className={cx("relative", page === id && "text-accent")}
							/>
							<span className="relative">{label}</span>
							{id === "reading" && reading > 0 && (
								<span className="relative ml-auto text-[10px] bg-accent/15 text-accent rounded-full px-1.5 py-0.5">
									{reading}
								</span>
							)}
						</button>
					))}
				</nav>
				<div className="px-5 py-4 text-[11px] text-ink-3 no-drag">
					{new Date().getFullYear()}
				</div>
			</aside>
			<main className="flex-1 min-w-0 flex flex-col">
				<div className="h-10 drag-region shrink-0" />
				<div className="flex-1 overflow-y-auto px-10 pb-10">
					<AnimatePresence mode="wait">
						<motion.div
							key={page}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.18 }}
						>
							{pages[page]}
						</motion.div>
					</AnimatePresence>
				</div>
			</main>
			<BookModal bookId={openBook} onClose={() => setOpenBook(null)} />
		</div>
	)
}
