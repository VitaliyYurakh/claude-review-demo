import type { ReadingStatus } from "@shared/types"
import { AnimatePresence, motion } from "framer-motion"
import { ImagePlus, Loader2, Search, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui"
import { type OlHit, searchOpenLibrary } from "@/lib/openlibrary"
import { statusLabel, useLibrary } from "@/store/library"

const addStatuses: ReadingStatus[] = ["planned", "reading", "done"]

export default function BookForm({
	open,
	onClose,
	bookId,
}: {
	open: boolean
	onClose: () => void
	bookId?: string
}) {
	const book = useLibrary((s) => s.books.find((b) => b.id === bookId))
	const addBook = useLibrary((s) => s.addBook)
	const updateBook = useLibrary((s) => s.updateBook)
	const removeBook = useLibrary((s) => s.removeBook)

	const [title, setTitle] = useState("")
	const [author, setAuthor] = useState("")
	const [pages, setPages] = useState("")
	const [genre, setGenre] = useState("")
	const [description, setDescription] = useState("")
	const [cover, setCover] = useState("")
	const [status, setStatus] = useState<ReadingStatus>("planned")
	const [confirmDelete, setConfirmDelete] = useState(false)

	const [query, setQuery] = useState("")
	const [hits, setHits] = useState<OlHit[]>([])
	const [searching, setSearching] = useState(false)
	const [showHits, setShowHits] = useState(false)
	const seq = useRef(0)

	useEffect(() => {
		if (!open) return
		setTitle(book?.title ?? "")
		setAuthor(book?.author ?? "")
		setPages(book?.pages ? String(book.pages) : "")
		setGenre(book?.genre ?? "")
		setDescription(book?.description ?? "")
		setCover(book?.cover ?? "")
		setStatus("planned")
		setConfirmDelete(false)
		setQuery("")
		setHits([])
		setShowHits(false)
	}, [open, book])

	useEffect(() => {
		const q = query.trim()
		if (!open || book || q.length < 3) {
			setHits([])
			setSearching(false)
			return
		}
		setSearching(true)
		const mine = ++seq.current
		const t = setTimeout(async () => {
			const res = await searchOpenLibrary(q)
			if (mine !== seq.current) return
			setHits(res)
			setShowHits(true)
			setSearching(false)
		}, 450)
		return () => clearTimeout(t)
	}, [query, open, book])

	const pickHit = (h: OlHit) => {
		setTitle(h.title)
		setAuthor(h.author)
		if (h.pages) setPages(String(h.pages))
		if (h.cover) setCover(h.cover)
		setShowHits(false)
		setQuery("")
	}

	const pickFile = async () => {
		const data = await window.api.pickCover()
		if (data) setCover(data)
	}

	const save = () => {
		const t = title.trim()
		if (!t) return
		const patch = {
			title: t,
			author: author.trim(),
			pages: pages.trim() ? Number(pages) : undefined,
			genre: genre.trim() || undefined,
			description: description.trim() || undefined,
			cover: cover.trim() || undefined,
		}
		if (book) updateBook(book.id, patch)
		else addBook(patch, status)
		onClose()
	}

	const del = () => {
		if (!book) return
		removeBook(book.id)
		onClose()
	}

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={book ? "Редагувати книгу" : "Нова книга"}
		>
			<div className="space-y-4">
				{!book && (
					<div className="relative">
						<Field label="Знайти в Open Library">
							<div className="relative">
								<Search
									size={15}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
								/>
								<Input
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									onFocus={() => hits.length && setShowHits(true)}
									placeholder="Назва або автор…"
									className="pl-9"
								/>
								{searching && (
									<Loader2
										size={15}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 animate-spin"
									/>
								)}
							</div>
						</Field>
						<AnimatePresence>
							{showHits && hits.length > 0 && (
								<motion.div
									initial={{ opacity: 0, y: -6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									className="absolute z-10 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-panel border border-line rounded-xl shadow-xl p-1"
								>
									{hits.map((h) => (
										<button
											key={`${h.title}-${h.author}-${h.year ?? ""}-${h.cover ?? ""}`}
											type="button"
											onClick={() => pickHit(h)}
											className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-panel-2 transition"
										>
											<div className="w-8 h-11 rounded overflow-hidden bg-panel-2 border border-line shrink-0">
												{h.cover && (
													<img
														src={h.cover}
														alt=""
														className="w-full h-full object-cover"
													/>
												)}
											</div>
											<div className="min-w-0">
												<div className="text-sm text-ink truncate">
													{h.title}
												</div>
												<div className="text-xs text-ink-3 truncate">
													{h.author}
													{h.year ? ` · ${h.year}` : ""}
												</div>
											</div>
										</button>
									))}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}

				<Field label="Назва">
					<Input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Назва книги"
					/>
				</Field>
				<Field label="Автор">
					<Input
						value={author}
						onChange={(e) => setAuthor(e.target.value)}
						placeholder="Ім'я автора"
					/>
				</Field>

				<div className="grid grid-cols-2 gap-3">
					<Field label="Сторінок">
						<Input
							type="number"
							min={0}
							value={pages}
							onChange={(e) => setPages(e.target.value)}
							placeholder="320"
						/>
					</Field>
					<Field label="Жанр">
						<Input
							value={genre}
							onChange={(e) => setGenre(e.target.value)}
							placeholder="Роман, есеїстика…"
						/>
					</Field>
				</div>

				<Field label="Опис">
					<Textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Кілька рядків про книгу"
					/>
				</Field>

				<Field label="Обкладинка">
					<div className="flex items-start gap-3">
						<div className="w-16 h-24 rounded-md overflow-hidden bg-panel-2 border border-line shrink-0">
							{cover && (
								<img
									src={cover}
									alt=""
									className="w-full h-full object-cover"
								/>
							)}
						</div>
						<div className="flex-1 space-y-2">
							<Button
								type="button"
								icon={<ImagePlus size={15} />}
								onClick={pickFile}
							>
								Обрати файл
							</Button>
							<Input
								value={cover}
								onChange={(e) => setCover(e.target.value)}
								placeholder="https://… посилання на зображення"
							/>
						</div>
					</div>
				</Field>

				{!book && (
					<Field label="Статус">
						<Select
							value={status}
							onChange={(e) => setStatus(e.target.value as ReadingStatus)}
							className="w-full"
						>
							{addStatuses.map((s) => (
								<option key={s} value={s}>
									{statusLabel[s]}
								</option>
							))}
						</Select>
					</Field>
				)}
			</div>

			<div className="flex items-center gap-2 mt-6 pt-4 border-t border-line">
				{book &&
					(confirmDelete ? (
						<div className="flex items-center gap-2">
							<span className="text-xs text-ink-2">Точно видалити?</span>
							<Button variant="danger" size="sm" onClick={del}>
								Так
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setConfirmDelete(false)}
							>
								Ні
							</Button>
						</div>
					) : (
						<Button
							variant="danger"
							icon={<Trash2 size={15} />}
							onClick={() => setConfirmDelete(true)}
						>
							Видалити
						</Button>
					))}
				<div className="ml-auto flex gap-2">
					<Button variant="ghost" onClick={onClose}>
						Скасувати
					</Button>
					<Button variant="primary" onClick={save} disabled={!title.trim()}>
						Зберегти
					</Button>
				</div>
			</div>
		</Modal>
	)
}
