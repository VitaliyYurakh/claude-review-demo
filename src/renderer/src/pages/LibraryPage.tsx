import type { Book, ReadingStatus } from "@shared/types"
import { motion } from "framer-motion"
import {
	LayoutGrid,
	Library as LibraryIcon,
	List,
	Plus,
	Search,
} from "lucide-react"
import { useMemo, useState } from "react"
import BookForm from "@/components/BookForm"
import {
	Button,
	Cover,
	cx,
	Empty,
	Input,
	PageHeader,
	Select,
	Stars,
	StatusBadge,
} from "@/components/ui"
import { statusLabel, useLibrary } from "@/store/library"

type Sort = "added" | "title" | "author" | "rating"

const sortLabel: Record<Sort, string> = {
	added: "За додаванням",
	title: "За назвою",
	author: "За автором",
	rating: "За оцінкою",
}

const statuses: ReadingStatus[] = ["planned", "reading", "done", "dropped"]

export default function LibraryPage({
	onOpen,
}: {
	onOpen: (id: string) => void
}) {
	const books = useLibrary((s) => s.books)
	const readings = useLibrary((s) => s.readings)

	const [adding, setAdding] = useState(false)
	const [q, setQ] = useState("")
	const [status, setStatus] = useState<ReadingStatus | "all">("all")
	const [genre, setGenre] = useState("all")
	const [sort, setSort] = useState<Sort>("added")
	const [view, setView] = useState<"grid" | "list">("grid")

	const genres = useMemo(
		() =>
			[
				...new Set(books.map((b) => b.genre).filter((g): g is string => !!g)),
			].sort((a, b) => a.localeCompare(b)),
		[books],
	)

	const readingOf = (id: string) => readings.find((r) => r.bookId === id)

	const list = useMemo(() => {
		const needle = q.trim().toLowerCase()
		const filtered = books.filter((b) => {
			const r = readings.find((x) => x.bookId === b.id)
			if (status !== "all" && r?.status !== status) return false
			if (genre !== "all" && b.genre !== genre) return false
			if (needle && !`${b.title} ${b.author}`.toLowerCase().includes(needle))
				return false
			return true
		})
		const rating = (b: Book) =>
			readings.find((x) => x.bookId === b.id)?.rating ?? 0
		return [...filtered].sort((a, b) => {
			if (sort === "title") return a.title.localeCompare(b.title)
			if (sort === "author") return a.author.localeCompare(b.author)
			if (sort === "rating") return rating(b) - rating(a)
			return b.createdAt.localeCompare(a.createdAt)
		})
	}, [books, readings, q, status, genre, sort])

	return (
		<div>
			<PageHeader
				title="Бібліотека"
				subtitle={`${books.length} ${plural(books.length)} у колекції`}
				actions={
					<Button
						variant="primary"
						icon={<Plus size={16} />}
						onClick={() => setAdding(true)}
					>
						Додати книгу
					</Button>
				}
			/>

			<div className="flex flex-wrap items-center gap-2 mb-6">
				<div className="relative flex-1 min-w-56">
					<Search
						size={15}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
					/>
					<Input
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Пошук за назвою або автором…"
						className="pl-9"
					/>
				</div>

				<Select
					value={status}
					onChange={(e) => setStatus(e.target.value as ReadingStatus | "all")}
				>
					<option value="all">Усі статуси</option>
					{statuses.map((s) => (
						<option key={s} value={s}>
							{statusLabel[s]}
						</option>
					))}
				</Select>

				<Select value={genre} onChange={(e) => setGenre(e.target.value)}>
					<option value="all">Усі жанри</option>
					{genres.map((g) => (
						<option key={g} value={g}>
							{g}
						</option>
					))}
				</Select>

				<Select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
					{(Object.keys(sortLabel) as Sort[]).map((s) => (
						<option key={s} value={s}>
							{sortLabel[s]}
						</option>
					))}
				</Select>

				<div className="flex bg-panel-2 border border-line rounded-lg p-0.5">
					{(
						[
							["grid", LayoutGrid],
							["list", List],
						] as const
					).map(([id, Icon]) => (
						<button
							type="button"
							key={id}
							onClick={() => setView(id)}
							className={cx(
								"p-1.5 rounded-md transition",
								view === id
									? "bg-panel text-ink shadow-sm"
									: "text-ink-3 hover:text-ink-2",
							)}
						>
							<Icon size={16} />
						</button>
					))}
				</div>
			</div>

			{list.length === 0 ? (
				<Empty
					icon={<LibraryIcon size={40} />}
					title={
						books.length === 0 ? "Бібліотека порожня" : "Нічого не знайдено"
					}
					hint={
						books.length === 0
							? "Додай першу книгу — і полиця почне заповнюватись."
							: "Спробуй змінити фільтри або пошуковий запит."
					}
					action={
						books.length === 0 && (
							<Button
								variant="primary"
								icon={<Plus size={16} />}
								onClick={() => setAdding(true)}
							>
								Додати книгу
							</Button>
						)
					}
				/>
			) : view === "grid" ? (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-5">
					{list.map((b, i) => {
						const r = readingOf(b.id)
						return (
							<motion.button
								key={b.id}
								initial={{ opacity: 0, y: 14 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03 }}
								onClick={() => onOpen(b.id)}
								className="group text-left bg-panel border border-line rounded-xl p-3 hover:border-ink-3/40 hover:shadow-lg transition-all"
							>
								<div className="flex justify-center">
									<Cover
										book={b}
										size="lg"
										className="w-full h-52 transition-transform group-hover:-translate-y-0.5"
									/>
								</div>
								<div className="mt-3 font-serif text-[15px] leading-snug text-ink line-clamp-2">
									{b.title}
								</div>
								<div className="text-xs text-ink-3 truncate mt-0.5">
									{b.author}
								</div>
								<div className="flex items-center justify-between gap-2 mt-2.5">
									{r && <StatusBadge status={r.status} />}
									{r?.rating ? <Stars value={r.rating} size={12} /> : null}
								</div>
							</motion.button>
						)
					})}
				</div>
			) : (
				<div className="space-y-2">
					{list.map((b, i) => {
						const r = readingOf(b.id)
						return (
							<motion.button
								key={b.id}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.24, delay: Math.min(i, 14) * 0.02 }}
								onClick={() => onOpen(b.id)}
								className="w-full text-left flex items-center gap-4 bg-panel border border-line rounded-xl p-3 hover:border-ink-3/40 hover:shadow-md transition-all"
							>
								<Cover book={b} size="sm" />
								<div className="min-w-0 flex-1">
									<div className="font-serif text-[15px] text-ink truncate">
										{b.title}
									</div>
									<div className="text-xs text-ink-3 truncate mt-0.5">
										{b.author}
										{b.genre ? ` · ${b.genre}` : ""}
									</div>
								</div>
								{r?.rating ? <Stars value={r.rating} size={13} /> : null}
								{r && <StatusBadge status={r.status} />}
							</motion.button>
						)
					})}
				</div>
			)}

			<BookForm open={adding} onClose={() => setAdding(false)} />
		</div>
	)
}

function plural(n: number) {
	const d = n % 10
	const h = n % 100
	if (d === 1 && h !== 11) return "книга"
	if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return "книги"
	return "книг"
}
