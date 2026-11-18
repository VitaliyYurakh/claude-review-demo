import type { Note } from "@shared/types"
import { ListPlus, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import {
	Button,
	cx,
	Empty,
	Field,
	Input,
	Modal,
	PageHeader,
	Textarea,
} from "@/components/ui"
import { useLibrary } from "@/store/library"

const OTHER = "Без категорії"

const NUMBERED = /^\s*\d+\s*[.)\]]\s*(.+)$/
const DASH = /\s+[-–—]+\s+/

export interface ParsedNote {
	title: string
	author?: string
	category: string
}

export function parseNotes(raw: string, defaultCategory: string): ParsedNote[] {
	const out: ParsedNote[] = []
	let category = defaultCategory.trim()

	for (const line of raw.split("\n")) {
		const text = line.trim()
		if (!text) continue

		const numbered = text.match(NUMBERED)
		if (!numbered) {
			category = text.replace(/[:：]\s*$/, "").trim()
			continue
		}

		const body = numbered[1].trim()
		const at = body.search(DASH)
		const title = at === -1 ? body : body.slice(0, at).trim()
		const author =
			at === -1
				? undefined
				: body.slice(at).replace(DASH, "").trim() || undefined
		if (title) out.push({ title, author, category })
	}

	return out
}

export default function NotesPage() {
	const notes = useLibrary((s) => s.notes)
	const removeNote = useLibrary((s) => s.removeNote)

	const [filter, setFilter] = useState<string | null>(null)
	const [editing, setEditing] = useState<Note | "new" | null>(null)
	const [bulkOpen, setBulkOpen] = useState(false)

	const categories = useMemo(() => {
		const counts = new Map<string, number>()
		for (const n of notes) {
			const c = n.category.trim() || OTHER
			counts.set(c, (counts.get(c) ?? 0) + 1)
		}
		return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "uk"))
	}, [notes])

	const shown = filter
		? notes.filter((n) => (n.category.trim() || OTHER) === filter)
		: notes

	return (
		<div>
			<PageHeader
				title="Нотатки"
				subtitle="Книжки, записані просто як нотатка"
				actions={
					<>
						<Button
							icon={<ListPlus size={16} />}
							onClick={() => setBulkOpen(true)}
						>
							Списком
						</Button>
						<Button
							variant="primary"
							icon={<Plus size={16} />}
							onClick={() => setEditing("new")}
						>
							Нова нотатка
						</Button>
					</>
				}
			/>

			{categories.length > 0 && (
				<div className="flex flex-wrap gap-2 mb-6">
					<Chip
						active={filter === null}
						onClick={() => setFilter(null)}
						label="Усі"
						count={notes.length}
					/>
					{categories.map(([name, count]) => (
						<Chip
							key={name}
							active={filter === name}
							onClick={() => setFilter(filter === name ? null : name)}
							label={name}
							count={count}
						/>
					))}
				</div>
			)}

			{shown.length === 0 ? (
				<Empty
					icon={<NotebookPen size={40} />}
					title={
						notes.length === 0 ? "Нотаток ще немає" : "У цій категорії порожньо"
					}
					hint="Запишіть книжку одним рядком — без обкладинки, статусу й планів."
					action={
						<Button
							variant="primary"
							icon={<ListPlus size={16} />}
							onClick={() => setBulkOpen(true)}
						>
							Додати списком
						</Button>
					}
				/>
			) : (
				<div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
					{shown.map((note) => (
						<div
							key={note.id}
							className="group bg-panel border border-line rounded-xl px-4 py-3 hover:border-ink-3/40 transition-colors"
						>
							<div className="flex items-start gap-2">
								<div className="min-w-0 flex-1">
									<div className="text-sm font-medium text-ink break-words">
										{note.title}
									</div>
									{note.author && (
										<div className="text-xs text-ink-2 mt-0.5 break-words">
											{note.author}
										</div>
									)}
								</div>
								<div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setEditing(note)}
										aria-label="Редагувати"
									>
										<Pencil size={14} />
									</Button>
									<Button
										variant="danger"
										size="sm"
										onClick={() => removeNote(note.id)}
										aria-label="Видалити"
									>
										<Trash2 size={14} />
									</Button>
								</div>
							</div>

							{note.text && (
								<p className="text-xs text-ink-2 mt-2 whitespace-pre-wrap break-words">
									{note.text}
								</p>
							)}

							<div className="mt-3 text-[11px] text-ink-3">
								{note.category.trim() || OTHER}
							</div>
						</div>
					))}
				</div>
			)}

			<NoteModal
				note={editing}
				onClose={() => setEditing(null)}
				categories={categories.map(([c]) => c)}
			/>
			<BulkModal
				open={bulkOpen}
				onClose={() => setBulkOpen(false)}
				categories={categories.map(([c]) => c)}
			/>
		</div>
	)
}

function Chip({
	label,
	count,
	active,
	onClick,
}: {
	label: string
	count: number
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cx(
				"rounded-full border px-3 py-1 text-xs transition",
				active
					? "border-accent bg-accent-soft/40 text-accent"
					: "border-line bg-panel text-ink-2 hover:text-ink",
			)}
		>
			{label}
			<span className="ml-1.5 tabular-nums text-ink-3">{count}</span>
		</button>
	)
}

function NoteModal({
	note,
	categories,
	onClose,
}: {
	note: Note | "new" | null
	categories: string[]
	onClose: () => void
}) {
	const addNote = useLibrary((s) => s.addNote)
	const updateNote = useLibrary((s) => s.updateNote)

	const existing = note && note !== "new" ? note : null
	const [form, setForm] = useState({
		title: "",
		author: "",
		category: "",
		text: "",
	})
	const [key, setKey] = useState<string | null>(null)

	const formKey = existing?.id ?? (note === "new" ? "new" : null)
	if (formKey !== key) {
		setKey(formKey)
		setForm({
			title: existing?.title ?? "",
			author: existing?.author ?? "",
			category: existing?.category ?? "",
			text: existing?.text ?? "",
		})
	}

	const save = () => {
		const title = form.title.trim()
		if (!title) return
		const patch = {
			title,
			author: form.author.trim() || undefined,
			category: form.category.trim(),
			text: form.text.trim() || undefined,
		}
		if (existing) updateNote(existing.id, patch)
		else addNote(patch)
		onClose()
	}

	return (
		<Modal
			open={note !== null}
			onClose={onClose}
			title={existing ? "Нотатка" : "Нова нотатка"}
		>
			<div className="space-y-3">
				<Field label="Назва">
					<Input
						autoFocus
						value={form.title}
						onChange={(e) => setForm({ ...form, title: e.target.value })}
						placeholder="Назва книжки"
						onKeyDown={(e) => e.key === "Enter" && save()}
					/>
				</Field>
				<Field label="Автор">
					<Input
						value={form.author}
						onChange={(e) => setForm({ ...form, author: e.target.value })}
						placeholder="необов’язково"
					/>
				</Field>
				<Field label="Категорія">
					<Input
						list="note-categories"
						value={form.category}
						onChange={(e) => setForm({ ...form, category: e.target.value })}
						placeholder={OTHER}
					/>
					<datalist id="note-categories">
						{categories.map((c) => (
							<option key={c} value={c} />
						))}
					</datalist>
				</Field>
				<Field label="Нотатка">
					<Textarea
						value={form.text}
						onChange={(e) => setForm({ ...form, text: e.target.value })}
						placeholder="Чому варто прочитати, хто порадив, де побачив…"
					/>
				</Field>
			</div>
			<div className="mt-5 flex gap-2 justify-end">
				<Button variant="ghost" onClick={onClose}>
					Скасувати
				</Button>
				<Button variant="primary" onClick={save} disabled={!form.title.trim()}>
					Зберегти
				</Button>
			</div>
		</Modal>
	)
}

function BulkModal({
	open,
	categories,
	onClose,
}: {
	open: boolean
	categories: string[]
	onClose: () => void
}) {
	const addNote = useLibrary((s) => s.addNote)
	const [raw, setRaw] = useState("")
	const [category, setCategory] = useState("")

	const parsed = useMemo(() => parseNotes(raw, category), [raw, category])

	const close = () => {
		setRaw("")
		setCategory("")
		onClose()
	}

	const save = () => {
		for (const p of parsed) addNote({ ...p })
		close()
	}

	return (
		<Modal open={open} onClose={close} title="Додати списком" wide>
			<div className="space-y-3">
				<Field label="Категорія за замовчуванням">
					<Input
						list="note-categories-bulk"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						placeholder={OTHER}
					/>
					<datalist id="note-categories-bulk">
						{categories.map((c) => (
							<option key={c} value={c} />
						))}
					</datalist>
				</Field>

				<Field label="Список">
					<Textarea
						autoFocus
						value={raw}
						onChange={(e) => setRaw(e.target.value)}
						className="min-h-64 font-mono text-xs"
						placeholder={
							"Психологія:\n1. Мислення швидке й повільне - Деніел Канеман\n2. Потік - Міхай Чиксентмігаї\n\nБізнес:\n1. Від нуля до одиниці - Пітер Тіль"
						}
					/>
				</Field>

				<div className="text-xs text-ink-3">
					Рядок «число. назва - автор» стає нотаткою. Рядок без номера — це
					назва категорії для наступних рядків.
				</div>

				{parsed.length > 0 && (
					<div className="border border-line rounded-lg divide-y divide-line max-h-64 overflow-y-auto">
						{parsed.map((p, i) => (
							<div
								key={`${p.category}-${p.title}-${p.author ?? ""}`}
								className="flex items-baseline gap-3 px-3 py-2 text-xs"
							>
								<span className="text-ink-3 tabular-nums w-5 shrink-0">
									{i + 1}
								</span>
								<span className="text-ink font-medium truncate flex-1">
									{p.title}
								</span>
								<span className="text-ink-2 truncate max-w-40">
									{p.author ?? "—"}
								</span>
								<span className="text-ink-3 truncate max-w-32">
									{p.category.trim() || OTHER}
								</span>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="mt-5 flex items-center gap-2 justify-end">
				<span className="text-xs text-ink-3 mr-auto">
					Розпізнано: {parsed.length}
				</span>
				<Button variant="ghost" onClick={close}>
					Скасувати
				</Button>
				<Button variant="primary" onClick={save} disabled={parsed.length === 0}>
					Додати {parsed.length || ""}
				</Button>
			</div>
		</Modal>
	)
}
