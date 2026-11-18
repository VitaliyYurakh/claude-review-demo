import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core"
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Book, Reading } from "@shared/types"
import { motion } from "framer-motion"
import {
	AlertTriangle,
	Dices,
	GripVertical,
	ListTodo,
	Play,
	Sparkles,
	Square,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"
import {
	Button,
	Cover,
	cx,
	Empty,
	Markdown,
	Modal,
	PageHeader,
} from "@/components/ui"
import { useAi } from "@/lib/ai"
import { useLibrary } from "@/store/library"

const PACE = 30

export default function PlansPage({
	onOpen,
}: {
	onOpen: (id: string) => void
}) {
	const books = useLibrary((s) => s.books)
	const readings = useLibrary((s) => s.readings)
	const reorderPlanned = useLibrary((s) => s.reorderPlanned)
	const setStatus = useLibrary((s) => s.setStatus)

	const [highlight, setHighlight] = useState<string | null>(null)
	const [adviceOpen, setAdviceOpen] = useState(false)
	const shuffling = useRef(false)

	const planned = useMemo(() => {
		const pairs: { book: Book; reading: Reading }[] = []
		for (const r of readings) {
			if (r.status !== "planned") continue
			const book = books.find((b) => b.id === r.bookId)
			if (book) pairs.push({ book, reading: r })
		}
		return pairs.sort((a, b) => a.reading.order - b.reading.order)
	}, [books, readings])

	const totalPages = planned.reduce((sum, p) => sum + (p.book.pages ?? 0), 0)
	const estDays = Math.ceil(totalPages / PACE)

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	)

	const onDragEnd = (e: DragEndEvent) => {
		const { active, over } = e
		if (!over || active.id === over.id) return
		const ids = planned.map((p) => p.book.id)
		const from = ids.indexOf(String(active.id))
		const to = ids.indexOf(String(over.id))
		if (from === -1 || to === -1) return
		reorderPlanned(arrayMove(ids, from, to))
	}

	const pickRandom = () => {
		if (shuffling.current || planned.length === 0) return
		shuffling.current = true
		const ids = planned.map((p) => p.book.id)
		const target = ids[Math.floor(Math.random() * ids.length)]
		const steps = Math.min(14, Math.max(6, ids.length * 2))
		let i = 0
		const tick = () => {
			if (i >= steps) {
				setHighlight(target)
				setTimeout(() => {
					setHighlight(null)
					shuffling.current = false
					onOpen(target)
				}, 420)
				return
			}
			setHighlight(ids[i % ids.length])
			i += 1
			setTimeout(tick, 70 + i * 5)
		}
		tick()
	}

	return (
		<div>
			<PageHeader
				title="Плани"
				subtitle="Черга книг, які чекають своєї черги"
				actions={
					<>
						<Button
							icon={<Dices size={16} />}
							onClick={pickRandom}
							disabled={planned.length === 0}
						>
							Випадкова книга
						</Button>
						<Button
							variant="primary"
							icon={<Sparkles size={16} />}
							onClick={() => setAdviceOpen(true)}
						>
							Порадь, що читати далі
						</Button>
					</>
				}
			/>

			<div className="grid grid-cols-3 gap-4 mb-6">
				<Stat label="Книг у черзі" value={String(planned.length)} />
				<Stat
					label="Сторінок разом"
					value={totalPages ? totalPages.toLocaleString("uk-UA") : "—"}
				/>
				<Stat
					label={`Орієнтовно за ${PACE} стор. на день`}
					value={totalPages ? `${estDays} дн.` : "—"}
				/>
			</div>

			{planned.length === 0 ? (
				<Empty
					icon={<ListTodo size={40} />}
					title="Черга порожня"
					hint="Додайте книги в бібліотеці — і вони з’являться тут як план читання."
				/>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={onDragEnd}
				>
					<SortableContext
						items={planned.map((p) => p.book.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="space-y-2">
							{planned.map(({ book }, i) => (
								<PlanRow
									key={book.id}
									book={book}
									position={i + 1}
									highlighted={highlight === book.id}
									onOpen={onOpen}
									onStart={() => setStatus(book.id, "reading")}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}

			<AdviceModal open={adviceOpen} onClose={() => setAdviceOpen(false)} />
		</div>
	)
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-panel border border-line rounded-xl px-5 py-4">
			<div className="font-serif text-2xl font-semibold tabular-nums">
				{value}
			</div>
			<div className="text-xs text-ink-3 mt-1">{label}</div>
		</div>
	)
}

function PlanRow({
	book,
	position,
	highlighted,
	onOpen,
	onStart,
}: {
	book: Book
	position: number
	highlighted: boolean
	onOpen: (id: string) => void
	onStart: () => void
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: book.id })

	return (
		<motion.div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			animate={highlighted ? { scale: 1.015 } : { scale: 1 }}
			transition={{ duration: 0.12 }}
			className={cx(
				"group flex items-center gap-4 bg-panel border rounded-xl px-4 py-3 transition-colors",
				isDragging
					? "border-accent shadow-lg z-10 relative"
					: "border-line hover:border-ink-3/40",
				highlighted && "border-accent bg-accent-soft/30",
			)}
		>
			<button
				{...attributes}
				{...listeners}
				className="text-ink-3 hover:text-ink cursor-grab active:cursor-grabbing touch-none"
				aria-label="Перетягнути"
			>
				<GripVertical size={18} />
			</button>

			<span className="font-serif text-lg text-ink-3 tabular-nums w-6 text-center shrink-0">
				{position}
			</span>

			<button
				type="button"
				onClick={() => onOpen(book.id)}
				className="shrink-0"
			>
				<Cover book={book} size="sm" />
			</button>

			<button
				type="button"
				onClick={() => onOpen(book.id)}
				className="flex-1 min-w-0 text-left"
			>
				<div className="text-sm font-medium text-ink truncate group-hover:text-accent transition-colors">
					{book.title}
				</div>
				<div className="text-xs text-ink-2 truncate">{book.author}</div>
			</button>

			<div className="hidden md:flex items-center gap-4 text-xs text-ink-3 shrink-0">
				{book.genre && <span className="truncate max-w-32">{book.genre}</span>}
				{book.pages ? (
					<span className="tabular-nums">{book.pages} стор.</span>
				) : null}
			</div>

			<Button
				size="sm"
				icon={<Play size={13} />}
				onClick={onStart}
				className="shrink-0"
			>
				Почати читати
			</Button>
		</motion.div>
	)
}

function AdviceModal({
	open,
	onClose,
}: {
	open: boolean
	onClose: () => void
}) {
	const books = useLibrary((s) => s.books)
	const readings = useLibrary((s) => s.readings)
	const { text, running, error, ask, cancel } = useAi()
	const [started, setStarted] = useState(false)

	const buildPrompt = () => {
		const titleOf = (id: string) => books.find((b) => b.id === id)
		const lines: string[] = []

		const done = readings
			.filter((r) => r.status === "done")
			.map((r) => ({ r, b: titleOf(r.bookId) }))
			.filter((x): x is { r: Reading; b: Book } => Boolean(x.b))
		if (done.length) {
			lines.push("Що я вже прочитав:")
			for (const { r, b } of done) {
				const parts = [`- «${b.title}» — ${b.author}`]
				if (r.rating) parts.push(`оцінка ${r.rating}/5`)
				if (r.review) parts.push(`відгук: ${r.review.slice(0, 160)}`)
				lines.push(parts.join("; "))
			}
			lines.push("")
		}

		const now = readings
			.filter((r) => r.status === "reading")
			.map((r) => titleOf(r.bookId))
			.filter((b): b is Book => Boolean(b))
		if (now.length) {
			lines.push("Читаю зараз:")
			for (const b of now) lines.push(`- «${b.title}» — ${b.author}`)
			lines.push("")
		}

		const queue = readings
			.filter((r) => r.status === "planned")
			.sort((a, b) => a.order - b.order)
			.map((r) => titleOf(r.bookId))
			.filter((b): b is Book => Boolean(b))
		lines.push("Черга «прочитати»:")
		for (const b of queue) lines.push(`- «${b.title}» — ${b.author}`)

		return [
			"Ти — начитаний книжковий співрозмовник. Відповідай українською, стисло, у форматі markdown.",
			"",
			lines.join("\n"),
			"",
			"Запропонуй порядок наступних 5 книг із моєї черги — по одному реченню, чому саме зараз.",
			"Після цього, за бажанням, додай 3 книги, яких немає в моїй бібліотеці, і які варто додати.",
		].join("\n")
	}

	const run = () => {
		setStarted(true)
		ask(buildPrompt())
	}

	const close = () => {
		if (running) cancel()
		setStarted(false)
		onClose()
	}

	return (
		<Modal open={open} onClose={close} title="Що читати далі" wide>
			{!started ? (
				<div className="text-center py-6">
					<Sparkles size={32} className="mx-auto text-accent mb-3" />
					<p className="text-sm text-ink-2 max-w-md mx-auto">
						Claude подивиться на прочитане, оцінки й вашу чергу — і запропонує
						порядок наступних книг.
					</p>
					<Button
						variant="primary"
						className="mt-5"
						icon={<Sparkles size={16} />}
						onClick={run}
					>
						Запитати
					</Button>
				</div>
			) : (
				<div>
					{error && (
						<div className="rounded-lg border border-danger/40 bg-danger/10 text-danger px-4 py-3 text-sm flex gap-2">
							<AlertTriangle size={16} className="shrink-0 mt-0.5" />
							<div>
								<div className="font-medium">Не вдалося отримати відповідь</div>
								<div className="text-ink-2 mt-1">{error}</div>
								<div className="text-ink-3 mt-1 text-xs">
									Перевірте шлях до Claude CLI в розділі «Налаштування».
								</div>
							</div>
						</div>
					)}

					{text ? (
						<Markdown text={text} />
					) : running ? (
						<div className="text-sm text-ink-3">Думаю…</div>
					) : null}

					<div className="mt-5 flex gap-2">
						{running ? (
							<Button
								variant="danger"
								icon={<Square size={14} />}
								onClick={cancel}
							>
								Зупинити
							</Button>
						) : (
							<Button icon={<Sparkles size={15} />} onClick={run}>
								Запитати ще раз
							</Button>
						)}
					</div>
				</div>
			)}
		</Modal>
	)
}
