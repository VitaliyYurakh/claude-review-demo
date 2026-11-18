import type { AiNote, ReadingStatus } from "@shared/types"
import { AnimatePresence, motion } from "framer-motion"
import {
	BookPlus,
	ChevronDown,
	Eraser,
	Loader2,
	Pencil,
	Plus,
	Save,
	Sparkles,
	Square,
	Trash2,
	X,
} from "lucide-react"
import { useState } from "react"
import BookForm from "@/components/BookForm"
import {
	Button,
	Cover,
	cx,
	Input,
	Markdown,
	Modal,
	Progress,
	Stars,
	StatusBadge,
	Textarea,
} from "@/components/ui"
import { bookContext, templates, useAi } from "@/lib/ai"
import { statusLabel, useLibrary } from "@/store/library"

type Tab = "reading" | "quotes" | "ai"
type AiKind = AiNote["kind"]

const tabs: { id: Tab; label: string }[] = [
	{ id: "reading", label: "Читання" },
	{ id: "quotes", label: "Цитати" },
	{ id: "ai", label: "Помічник" },
]

const statuses: ReadingStatus[] = ["planned", "reading", "done", "dropped"]

const chips: { kind: AiKind; label: string; make: (ctx: string) => string }[] =
	[
		{ kind: "review", label: "Рецензія", make: templates.review },
		{ kind: "summary", label: "Про що без спойлерів", make: templates.summary },
		{ kind: "similar", label: "Схожі книги", make: templates.similar },
		{ kind: "worth", label: "Чи варто читати", make: templates.worth },
	]

const kindLabel: Record<AiKind, string> = {
	review: "Рецензія",
	summary: "Про що книга",
	similar: "Схожі книги",
	worth: "Чи варто читати",
	custom: "Питання",
	next: "Що далі",
}

export default function BookModal({
	bookId,
	onClose,
}: {
	bookId: string | null
	onClose: () => void
}) {
	const book = useLibrary((s) => s.books.find((b) => b.id === bookId))
	const reading = useLibrary((s) => s.readings.find((r) => r.bookId === bookId))
	const setStatus = useLibrary((s) => s.setStatus)
	const updateReading = useLibrary((s) => s.updateReading)
	const addQuote = useLibrary((s) => s.addQuote)
	const removeQuote = useLibrary((s) => s.removeQuote)
	const addAiNote = useLibrary((s) => s.addAiNote)
	const removeAiNote = useLibrary((s) => s.removeAiNote)
	const addBook = useLibrary((s) => s.addBook)

	const [tab, setTab] = useState<Tab>("reading")
	const [editing, setEditing] = useState(false)
	const [quote, setQuote] = useState("")
	const [shownBookId, setShownBookId] = useState(bookId)

	if (bookId !== shownBookId) {
		setShownBookId(bookId)
		setTab("reading")
		setQuote("")
		setEditing(false)
	}

	return (
		<Modal open={!!book} onClose={onClose} wide>
			{book && (
				<>
					<div className="flex items-start justify-between gap-4 mb-6">
						<div className="min-w-0">
							<h2 className="font-serif text-2xl font-semibold tracking-tight leading-snug">
								{book.title}
							</h2>
							<div className="text-sm text-ink-2 mt-1">{book.author}</div>
							<div className="flex items-center gap-2 mt-2.5 text-xs text-ink-3">
								{reading && <StatusBadge status={reading.status} />}
								{book.genre && <span>{book.genre}</span>}
								{book.pages && <span>{book.pages} с.</span>}
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="text-ink-3 hover:text-ink transition shrink-0"
						>
							<X size={18} />
						</button>
					</div>

					<div className="flex gap-8">
						<div className="shrink-0 w-40">
							<Cover book={book} size="lg" />
							<div className="mt-4 space-y-1">
								{statuses.map((s) => (
									<button
										type="button"
										key={s}
										onClick={() => setStatus(book.id, s)}
										className={cx(
											"w-full text-left px-3 py-1.5 rounded-lg text-xs transition border",
											reading?.status === s
												? "bg-accent-soft border-accent text-accent font-medium"
												: "border-transparent text-ink-2 hover:bg-panel-2",
										)}
									>
										{statusLabel[s]}
									</button>
								))}
							</div>
							<Button
								className="mt-4 w-full justify-center"
								icon={<Pencil size={14} />}
								onClick={() => setEditing(true)}
							>
								Редагувати
							</Button>
						</div>

						<div className="flex-1 min-w-0">
							<div className="flex gap-1 border-b border-line mb-5">
								{tabs.map((t) => (
									<button
										type="button"
										key={t.id}
										onClick={() => setTab(t.id)}
										className={cx(
											"relative px-3 py-2 text-sm transition",
											tab === t.id ? "text-ink" : "text-ink-3 hover:text-ink-2",
										)}
									>
										{t.label}
										{tab === t.id && (
											<motion.span
												layoutId="book-tab"
												className="absolute inset-x-2 -bottom-px h-0.5 bg-accent rounded-full"
											/>
										)}
									</button>
								))}
							</div>

							<AnimatePresence mode="wait">
								<motion.div
									key={tab}
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.15 }}
								>
									{tab === "reading" && reading && (
										<div className="space-y-5">
											<div className="grid grid-cols-2 gap-3">
												<label className="block">
													<span className="block text-xs font-medium text-ink-2 mb-1.5">
														Початок
													</span>
													<Input
														type="date"
														value={reading.startedAt ?? ""}
														onChange={(e) =>
															updateReading(book.id, {
																startedAt: e.target.value || undefined,
															})
														}
													/>
												</label>
												<label className="block">
													<span className="block text-xs font-medium text-ink-2 mb-1.5">
														Завершення
													</span>
													<Input
														type="date"
														value={reading.finishedAt ?? ""}
														onChange={(e) =>
															updateReading(book.id, {
																finishedAt: e.target.value || undefined,
															})
														}
													/>
												</label>
											</div>

											<div>
												<div className="flex items-end justify-between mb-1.5">
													<span className="text-xs font-medium text-ink-2">
														Сторінка
													</span>
													<span className="text-xs text-ink-3">
														{reading.currentPage ?? 0}
														{book.pages ? ` / ${book.pages}` : ""}
													</span>
												</div>
												<Input
													type="number"
													min={0}
													max={book.pages}
													value={reading.currentPage ?? ""}
													onChange={(e) =>
														updateReading(book.id, {
															currentPage: e.target.value
																? Number(e.target.value)
																: undefined,
														})
													}
												/>
												{book.pages ? (
													<Progress
														className="mt-2.5"
														value={
															((reading.currentPage ?? 0) / book.pages) * 100
														}
													/>
												) : null}
											</div>

											<div>
												<span className="block text-xs font-medium text-ink-2 mb-1.5">
													Оцінка
												</span>
												<Stars
													value={reading.rating}
													onChange={(v) =>
														updateReading(book.id, { rating: v })
													}
													size={22}
												/>
											</div>

											<label className="block">
												<span className="block text-xs font-medium text-ink-2 mb-1.5">
													Відгук
												</span>
												<Textarea
													value={reading.review ?? ""}
													onChange={(e) =>
														updateReading(book.id, { review: e.target.value })
													}
													placeholder="Що ти думаєш про цю книгу?"
													className="min-h-28"
												/>
											</label>
										</div>
									)}

									{tab === "quotes" && reading && (
										<div className="space-y-4">
											<form
												onSubmit={(e) => {
													e.preventDefault()
													if (!quote.trim()) return
													addQuote(book.id, quote.trim())
													setQuote("")
												}}
												className="flex gap-2"
											>
												<Input
													value={quote}
													onChange={(e) => setQuote(e.target.value)}
													placeholder="Додати цитату…"
												/>
												<Button
													type="submit"
													variant="primary"
													icon={<Plus size={15} />}
													disabled={!quote.trim()}
												>
													Додати
												</Button>
											</form>
											{reading.quotes.length === 0 ? (
												<div className="text-sm text-ink-3 py-6 text-center">
													Поки жодної цитати.
												</div>
											) : (
												<div className="space-y-2">
													{reading.quotes.map((q, i) => (
														<motion.div
															key={q}
															initial={{ opacity: 0, y: 6 }}
															animate={{ opacity: 1, y: 0 }}
															className="group flex gap-3 bg-panel-2 border border-line rounded-xl p-3"
														>
															<p className="flex-1 text-sm text-ink-2 font-serif italic leading-relaxed">
																{q}
															</p>
															<button
																type="button"
																onClick={() => removeQuote(book.id, i)}
																className="text-ink-3 hover:text-danger transition opacity-0 group-hover:opacity-100 shrink-0"
															>
																<Trash2 size={15} />
															</button>
														</motion.div>
													))}
												</div>
											)}
										</div>
									)}

									{tab === "ai" && reading && (
										<AiTab
											key={book.id}
											ctx={bookContext(book, reading)}
											notes={reading.aiNotes}
											onSave={(note) => addAiNote(book.id, note)}
											onRemove={(id) => removeAiNote(book.id, id)}
											onAddBook={(title, author) =>
												addBook({ title, author }, "planned")
											}
										/>
									)}
								</motion.div>
							</AnimatePresence>
						</div>
					</div>

					<BookForm
						open={editing}
						onClose={() => setEditing(false)}
						bookId={book.id}
					/>
				</>
			)}
		</Modal>
	)
}

interface Rec {
	title: string
	author: string
}

function parseRecs(raw: string): Rec[] {
	const m = /\[[\s\S]*\]/.exec(raw)
	if (!m) return []
	try {
		const parsed = JSON.parse(m[0])
		if (!Array.isArray(parsed)) return []
		return parsed
			.filter((r) => r && typeof r.title === "string")
			.map((r) => ({ title: String(r.title), author: String(r.author ?? "") }))
	} catch {
		return []
	}
}

function AiTab({
	ctx,
	notes,
	onSave,
	onRemove,
	onAddBook,
}: {
	ctx: string
	notes: AiNote[]
	onSave: (note: Omit<AiNote, "id" | "createdAt">) => void
	onRemove: (id: string) => void
	onAddBook: (title: string, author: string) => void
}) {
	const { text, running, error, ask, cancel } = useAi()
	const [active, setActive] = useState<{ kind: AiKind; label: string } | null>(
		null,
	)
	const [answer, setAnswer] = useState("")
	const [question, setQuestion] = useState("")
	const [open, setOpen] = useState<string | null>(null)

	const [recLoading, setRecLoading] = useState(false)
	const [recs, setRecs] = useState<Rec[] | null>(null)
	const [picked, setPicked] = useState<Set<number>>(new Set())

	const run = async (kind: AiKind, label: string, prompt: string) => {
		setActive({ kind, label })
		setAnswer("")
		setRecs(null)
		setPicked(new Set())
		const full = await ask(prompt)
		setAnswer(full)
	}

	const loadRecs = async () => {
		setRecLoading(true)
		setRecs(null)
		setPicked(new Set())
		const prompt = `${ctx}\n\nПорадь 5 схожих книг. Відповідай ВИКЛЮЧНО JSON-масивом без пояснень і без markdown: [{"title":"…","author":"…"}]`
		const raw = await ask(prompt, true)
		setRecs(parseRecs(raw))
		setRecLoading(false)
	}

	const streaming = running && !recLoading
	const done = !running && !!answer && !error
	const shown = streaming ? text : answer

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap gap-2">
				{chips.map((c) => (
					<button
						type="button"
						key={c.kind}
						onClick={() => run(c.kind, c.label, c.make(ctx))}
						disabled={running}
						className={cx(
							"px-3 py-1.5 rounded-full text-xs border transition disabled:opacity-50",
							active?.kind === c.kind
								? "bg-accent-soft border-accent text-accent"
								: "bg-panel-2 border-line text-ink-2 hover:text-ink hover:border-ink-3",
						)}
					>
						{c.label}
					</button>
				))}
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault()
					const q = question.trim()
					if (!q || running) return
					run("custom", q, templates.custom(ctx, q))
				}}
				className="flex gap-2"
			>
				<Input
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					placeholder="Спитати про книгу…"
					disabled={running}
				/>
				<Button
					type="submit"
					variant="primary"
					icon={<Sparkles size={15} />}
					disabled={running || !question.trim()}
				>
					Спитати
				</Button>
			</form>

			{error && (
				<div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
					<div>{error}</div>
					<div className="text-xs text-danger/80 mt-1">
						Перевір шлях до claude у Налаштуваннях.
					</div>
				</div>
			)}

			{(streaming || shown) && !error && (
				<div className="rounded-xl border border-line bg-panel-2 p-4">
					<Markdown text={shown} />
					{streaming && (
						<span className="inline-block w-1.5 h-4 bg-accent align-middle animate-pulse rounded-sm" />
					)}
					{streaming && (
						<div className="mt-3">
							<Button
								size="sm"
								variant="ghost"
								icon={<Square size={13} />}
								onClick={cancel}
							>
								Зупинити
							</Button>
						</div>
					)}
					{done && active && (
						<div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-line">
							<Button
								size="sm"
								variant="primary"
								icon={<Save size={13} />}
								onClick={() => {
									onSave({ kind: active.kind, prompt: active.label, answer })
									setAnswer("")
									setActive(null)
								}}
							>
								Зберегти
							</Button>
							<Button
								size="sm"
								variant="ghost"
								icon={<Eraser size={13} />}
								onClick={() => {
									setAnswer("")
									setActive(null)
									setRecs(null)
								}}
							>
								Очистити
							</Button>
							{active.kind === "similar" && (
								<Button
									size="sm"
									icon={<BookPlus size={13} />}
									onClick={loadRecs}
								>
									Додати рекомендації в бібліотеку
								</Button>
							)}
						</div>
					)}
				</div>
			)}

			{recLoading && (
				<div className="flex items-center gap-2 text-sm text-ink-3">
					<Loader2 size={15} className="animate-spin" />
					Готую список…
				</div>
			)}

			{recs && recs.length > 0 && (
				<div className="rounded-xl border border-line bg-panel-2 p-4 space-y-2">
					<div className="text-xs font-medium text-ink-2 mb-1">
						Обери, що додати в плани
					</div>
					{recs.map((r, i) => (
						<label
							key={`${r.title}-${r.author}`}
							className="flex items-center gap-2.5 text-sm text-ink-2 cursor-pointer"
						>
							<input
								type="checkbox"
								checked={picked.has(i)}
								onChange={(e) =>
									setPicked((p) => {
										const next = new Set(p)
										if (e.target.checked) next.add(i)
										else next.delete(i)
										return next
									})
								}
								className="accent-accent"
							/>
							<span className="text-ink">{r.title}</span>
							{r.author && (
								<span className="text-ink-3 text-xs">{r.author}</span>
							)}
						</label>
					))}
					<Button
						size="sm"
						variant="primary"
						className="mt-2"
						disabled={picked.size === 0}
						onClick={() => {
							for (const [i, r] of recs.entries()) {
								if (picked.has(i)) onAddBook(r.title, r.author)
							}
							setRecs(null)
							setPicked(new Set())
						}}
					>
						Додати {picked.size || ""}
					</Button>
				</div>
			)}

			{recs && recs.length === 0 && !recLoading && (
				<div className="text-sm text-ink-3">
					Не вдалося розібрати список книг.
				</div>
			)}

			{notes.length > 0 && (
				<div className="space-y-2 pt-2">
					<div className="text-xs font-medium text-ink-3 uppercase tracking-wide">
						Збережені відповіді
					</div>
					{notes.map((n) => (
						<div
							key={n.id}
							className="rounded-xl border border-line bg-panel-2 overflow-hidden"
						>
							<div className="flex items-center gap-2 px-3 py-2">
								<button
									type="button"
									onClick={() => setOpen(open === n.id ? null : n.id)}
									className="flex-1 flex items-center gap-2 text-left min-w-0"
								>
									<ChevronDown
										size={15}
										className={cx(
											"text-ink-3 transition-transform shrink-0",
											open === n.id && "rotate-180",
										)}
									/>
									<span className="text-sm text-ink truncate">
										{kindLabel[n.kind]}
									</span>
									<span className="text-xs text-ink-3 ml-auto shrink-0">
										{new Date(n.createdAt).toLocaleDateString("uk-UA")}
									</span>
								</button>
								<button
									type="button"
									onClick={() => onRemove(n.id)}
									className="text-ink-3 hover:text-danger transition shrink-0"
								>
									<Trash2 size={14} />
								</button>
							</div>
							<AnimatePresence initial={false}>
								{open === n.id && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: "auto", opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										className="overflow-hidden"
									>
										<div className="px-3 pb-3 border-t border-line pt-2">
											{n.prompt !== kindLabel[n.kind] && (
												<div className="text-xs text-ink-3 mb-2">
													{n.prompt}
												</div>
											)}
											<Markdown text={n.answer} />
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
