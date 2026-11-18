import type { Book, Reading } from "@shared/types"
import { motion } from "framer-motion"
import { BookOpen, Check, Plus, X } from "lucide-react"
import { useMemo, useState } from "react"
import {
	Button,
	Cover,
	Empty,
	PageHeader,
	Progress,
	Stars,
} from "@/components/ui"
import { useLibrary } from "@/store/library"

const daysBetween = (from: string) => {
	const start = new Date(from).getTime()
	if (Number.isNaN(start)) return 0
	return Math.max(0, Math.floor((Date.now() - start) / 86_400_000))
}

const dateLabel = (iso?: string) => {
	if (!iso) return null
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return null
	return d.toLocaleDateString("uk-UA", {
		day: "numeric",
		month: "long",
		year: "numeric",
	})
}

const forecast = (
	startedAt: string | undefined,
	current: number,
	total: number,
) => {
	if (!startedAt || total <= 0 || current <= 0 || current >= total) return null
	// день початку рахується першим днем читання
	const pace = current / (daysBetween(startedAt) + 1)
	const daysLeft = Math.ceil((total - current) / pace)
	const finish = new Date(Date.now() + daysLeft * 86_400_000).toISOString()
	return { pace, finish }
}

const dayWord = (n: number) => {
	const mod10 = n % 10
	const mod100 = n % 100
	if (mod10 === 1 && mod100 !== 11) return "день"
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дні"
	return "днів"
}

export default function ReadingPage({
	onOpen,
}: {
	onOpen: (id: string) => void
}) {
	const books = useLibrary((s) => s.books)
	const readings = useLibrary((s) => s.readings)

	const active = useMemo(() => {
		const pairs: { book: Book; reading: Reading }[] = []
		for (const r of readings) {
			if (r.status !== "reading") continue
			const book = books.find((b) => b.id === r.bookId)
			if (book) pairs.push({ book, reading: r })
		}
		return pairs.sort((a, b) =>
			(b.reading.startedAt ?? "").localeCompare(a.reading.startedAt ?? ""),
		)
	}, [books, readings])

	const recent = useMemo(() => {
		const pairs: { book: Book; reading: Reading }[] = []
		for (const r of readings) {
			if (r.status !== "done") continue
			const book = books.find((b) => b.id === r.bookId)
			if (book) pairs.push({ book, reading: r })
		}
		return pairs
			.sort((a, b) =>
				(b.reading.finishedAt ?? "").localeCompare(a.reading.finishedAt ?? ""),
			)
			.slice(0, 6)
	}, [books, readings])

	return (
		<div>
			<PageHeader
				title="Читаю"
				subtitle={
					active.length
						? `${active.length} у процесі`
						: "Зараз нічого не читається"
				}
			/>

			{active.length === 0 ? (
				<Empty
					icon={<BookOpen size={40} />}
					title="Жодної книги в процесі"
					hint="Загляньте в «Плани» й почніть читати те, що давно чекає на полиці."
				/>
			) : (
				<div className="space-y-4">
					{active.map(({ book, reading }, i) => (
						<ReadingCard
							key={book.id}
							book={book}
							reading={reading}
							index={i}
							onOpen={onOpen}
						/>
					))}
				</div>
			)}

			{recent.length > 0 && (
				<section className="mt-12">
					<h2 className="font-serif text-xl font-semibold mb-4">
						Нещодавно прочитане
					</h2>
					<div className="flex flex-wrap gap-5">
						{recent.map(({ book, reading }, i) => (
							<motion.button
								key={book.id}
								onClick={() => onOpen(book.id)}
								className="w-24 text-left group"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.03 * i, duration: 0.25 }}
							>
								<Cover
									book={book}
									className="group-hover:-translate-y-1 transition-transform"
								/>
								<div className="mt-2 text-xs font-medium text-ink leading-snug line-clamp-2">
									{book.title}
								</div>
								<div className="text-[11px] text-ink-3 truncate">
									{book.author}
								</div>
								<div className="mt-1">
									<Stars value={reading.rating ?? 0} size={11} />
								</div>
							</motion.button>
						))}
					</div>
				</section>
			)}
		</div>
	)
}

function ReadingCard({
	book,
	reading,
	index,
	onOpen,
}: {
	book: Book
	reading: Reading
	index: number
	onOpen: (id: string) => void
}) {
	const updateReading = useLibrary((s) => s.updateReading)
	const setStatus = useLibrary((s) => s.setStatus)
	const [draft, setDraft] = useState<string | null>(null)

	const total = book.pages ?? 0
	const current = reading.currentPage ?? 0
	const percent =
		total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
	const days = reading.startedAt ? daysBetween(reading.startedAt) : null
	const started = dateLabel(reading.startedAt)
	const eta = forecast(reading.startedAt, current, total)

	const setPage = (n: number) => {
		const clamped = Math.max(
			0,
			total > 0 ? Math.min(total, Math.round(n)) : Math.round(n),
		)
		updateReading(book.id, { currentPage: clamped })
	}

	return (
		<motion.article
			className="bg-panel border border-line rounded-xl p-5 flex gap-5 hover:border-ink-3/40 transition-colors"
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.05 * index, duration: 0.3 }}
		>
			<button
				type="button"
				onClick={() => onOpen(book.id)}
				className="shrink-0"
			>
				<Cover
					book={book}
					className="hover:-translate-y-1 transition-transform"
				/>
			</button>

			<div className="flex-1 min-w-0 flex flex-col">
				<button
					type="button"
					onClick={() => onOpen(book.id)}
					className="text-left"
				>
					<h3 className="font-serif text-xl font-semibold leading-tight hover:text-accent transition-colors">
						{book.title}
					</h3>
				</button>
				<div className="text-sm text-ink-2 mt-0.5">{book.author}</div>

				<div className="text-xs text-ink-3 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
					{started && <span>Почато {started}</span>}
					{days !== null && (
						<span>
							{days} {dayWord(days)} читання
						</span>
					)}
					{eta && (
						<>
							<span>
								≈{" "}
								{eta.pace.toLocaleString("uk-UA", { maximumFractionDigits: 1 })}{" "}
								стор./день
							</span>
							<span>Дочитаю ≈ {dateLabel(eta.finish)}</span>
						</>
					)}
				</div>

				<div className="mt-4">
					<div className="flex items-center gap-3">
						<input
							type="number"
							min={0}
							max={total || undefined}
							value={draft ?? String(current)}
							onChange={(e) => setDraft(e.target.value)}
							onFocus={(e) => e.currentTarget.select()}
							onBlur={() => {
								if (draft !== null && draft.trim() !== "")
									setPage(Number(draft))
								setDraft(null)
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter") e.currentTarget.blur()
								if (e.key === "Escape") {
									setDraft(null)
									e.currentTarget.blur()
								}
							}}
							className="w-20 rounded-lg bg-panel-2 border border-line px-2.5 py-1.5 text-sm text-ink tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
						/>
						<div className="flex-1">
							<Progress value={percent} />
						</div>
						<div className="text-xs text-ink-2 tabular-nums whitespace-nowrap">
							{percent}%{" "}
							{total > 0
								? `/ стор. ${current} з ${total}`
								: `/ стор. ${current}`}
						</div>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap gap-2">
					<Button
						size="sm"
						icon={<Plus size={13} />}
						onClick={() => setPage(current + 10)}
					>
						10 стор.
					</Button>
					<Button
						size="sm"
						icon={<Plus size={13} />}
						onClick={() => setPage(current + 25)}
					>
						25 стор.
					</Button>
					<Button
						size="sm"
						variant="primary"
						icon={<Check size={14} />}
						className="ml-auto"
						onClick={() => setStatus(book.id, "done")}
					>
						Завершити
					</Button>
					<Button
						size="sm"
						variant="danger"
						icon={<X size={14} />}
						onClick={() => setStatus(book.id, "dropped")}
					>
						Покинути
					</Button>
				</div>
			</div>
		</motion.article>
	)
}
