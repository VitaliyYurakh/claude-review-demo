import {
	type CollisionDetection,
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core"
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Book, Reading, Roadmap, Stage } from "@shared/types"
import { motion } from "framer-motion"
import {
	ArrowLeft,
	CalendarDays,
	Check,
	GripVertical,
	Map as MapIcon,
	Play,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
	Button,
	Cover,
	cx,
	Empty,
	Field,
	Input,
	Modal,
	PageHeader,
	Progress,
	StatusBadge,
	Textarea,
} from "@/components/ui"
import { today, useLibrary } from "@/store/library"

const fmtDate = (iso: string) =>
	new Date(`${iso}T00:00:00`).toLocaleDateString("uk-UA", {
		day: "numeric",
		month: "long",
		year: "numeric",
	})

const daysBetween = (a: string, b: string) =>
	Math.round(
		(new Date(`${b}T00:00:00`).getTime() -
			new Date(`${a}T00:00:00`).getTime()) /
			86400000,
	)

interface StageState {
	done: number
	total: number
	complete: boolean
	overdue: boolean
	soon: boolean
}

const stageState = (
	stage: Stage,
	doneIds: Set<string>,
	now: string,
): StageState => {
	const total = stage.bookIds.length
	const done = stage.bookIds.filter((id) => doneIds.has(id)).length
	const complete = total > 0 && done === total
	const overdue = !!stage.targetDate && stage.targetDate < now && !complete
	const soon =
		!!stage.targetDate &&
		!overdue &&
		!complete &&
		daysBetween(now, stage.targetDate) <= 7
	return { done, total, complete, overdue, soon }
}

const stageDragId = (stageId: string) => `stage:${stageId}`
const stageDropId = (stageId: string) => `stagedrop:${stageId}`
const bookDragId = (stageId: string, bookId: string) =>
	`book:${stageId}:${bookId}`

const stageOfDroppable = (id: string): string | null => {
	if (id.startsWith("stagedrop:")) return id.slice(10)
	if (id.startsWith("book:")) return id.split(":")[1]
	return null
}

const byActiveKind: CollisionDetection = (args) => {
	const draggingStage = String(args.active.id).startsWith("stage:")
	const droppableContainers = args.droppableContainers.filter((c) => {
		const id = String(c.id)
		return draggingStage
			? id.startsWith("stage:")
			: id.startsWith("book:") || id.startsWith("stagedrop:")
	})
	return closestCenter({ ...args, droppableContainers })
}

export default function RoadmapsPage({
	onOpen,
}: {
	onOpen: (id: string) => void
}) {
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const roadmaps = useLibrary((s) => s.roadmaps)
	const selected = roadmaps.find((r) => r.id === selectedId)

	if (selectedId && selected)
		return (
			<Detail
				roadmap={selected}
				onBack={() => setSelectedId(null)}
				onOpen={onOpen}
			/>
		)

	return <List roadmaps={roadmaps} onSelect={setSelectedId} />
}

function List({
	roadmaps,
	onSelect,
}: {
	roadmaps: Roadmap[]
	onSelect: (id: string) => void
}) {
	const readings = useLibrary((s) => s.readings)
	const addRoadmap = useLibrary((s) => s.addRoadmap)
	const [open, setOpen] = useState(false)
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")

	const doneIds = useMemo(
		() =>
			new Set(readings.filter((r) => r.status === "done").map((r) => r.bookId)),
		[readings],
	)
	const now = today()

	const create = () => {
		const t = title.trim()
		if (!t) return
		const created = addRoadmap({
			title: t,
			description: description.trim() || undefined,
		})
		setTitle("")
		setDescription("")
		setOpen(false)
		onSelect(created.id)
	}

	return (
		<>
			<PageHeader
				title="Роудмапи"
				subtitle="Довгі маршрути читання, розбиті на етапи"
				actions={
					<Button
						variant="primary"
						icon={<Plus size={16} />}
						onClick={() => setOpen(true)}
					>
						Новий роудмап
					</Button>
				}
			/>

			{roadmaps.length === 0 ? (
				<Empty
					icon={<MapIcon size={40} />}
					title="Ще немає жодного роудмапу"
					hint="Роудмап — це план читання на місяці вперед: етапи, книги та дедлайни."
					action={
						<Button
							variant="primary"
							icon={<Plus size={16} />}
							onClick={() => setOpen(true)}
						>
							Новий роудмап
						</Button>
					}
				/>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{roadmaps.map((rm, i) => {
						const states = rm.stages.map((s) => stageState(s, doneIds, now))
						const total = states.reduce((a, s) => a + s.total, 0)
						const done = states.reduce((a, s) => a + s.done, 0)
						const overdue = states.filter((s) => s.overdue).length
						const soon = states.some((s) => s.soon)
						const next = rm.stages
							.filter(
								(s, idx) =>
									s.targetDate && s.targetDate >= now && !states[idx].complete,
							)
							.sort((a, b) =>
								(a.targetDate ?? "").localeCompare(b.targetDate ?? ""),
							)[0]

						return (
							<motion.button
								key={rm.id}
								type="button"
								onClick={() => onSelect(rm.id)}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.25, delay: i * 0.04 }}
								className="text-left bg-panel border border-line rounded-xl p-5 hover:border-accent/40 hover:shadow-md transition-all"
							>
								<div className="flex items-start justify-between gap-3">
									<h3 className="font-serif text-xl font-semibold leading-snug">
										{rm.title}
									</h3>
									<span className="shrink-0 text-[11px] text-ink-3 mt-1">
										{rm.stages.length}{" "}
										{rm.stages.length === 1 ? "етап" : "етапів"}
									</span>
								</div>

								{rm.description && (
									<p className="text-sm text-ink-2 mt-2 line-clamp-2">
										{rm.description}
									</p>
								)}

								<div className="mt-5">
									<div className="flex items-baseline justify-between text-xs text-ink-2 mb-1.5">
										<span>Прогрес</span>
										<span className="tabular-nums">
											{done} / {total}
										</span>
									</div>
									<Progress value={total ? (done / total) * 100 : 0} />
								</div>

								<div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
									{next?.targetDate && (
										<span className="inline-flex items-center gap-1.5 text-ink-3">
											<CalendarDays size={13} />
											Наступний етап до {fmtDate(next.targetDate)}
										</span>
									)}
									{overdue > 0 && (
										<span className="rounded-full bg-danger/15 text-danger px-2 py-0.5 font-medium">
											Прострочено: {overdue}
										</span>
									)}
									{overdue === 0 && soon && (
										<span className="rounded-full bg-warn/15 text-warn px-2 py-0.5 font-medium">
											Дедлайн близько
										</span>
									)}
								</div>
							</motion.button>
						)
					})}
				</div>
			)}

			<Modal open={open} onClose={() => setOpen(false)} title="Новий роудмап">
				<div className="space-y-4">
					<Field label="Назва">
						<Input
							autoFocus
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Наприклад: Класика XX століття"
							onKeyDown={(e) => e.key === "Enter" && create()}
						/>
					</Field>
					<Field label="Опис">
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Про що цей маршрут і навіщо він"
						/>
					</Field>
					<div className="flex justify-end gap-2 pt-1">
						<Button variant="ghost" onClick={() => setOpen(false)}>
							Скасувати
						</Button>
						<Button variant="primary" onClick={create} disabled={!title.trim()}>
							Створити
						</Button>
					</div>
				</div>
			</Modal>
		</>
	)
}

function Detail({
	roadmap,
	onBack,
	onOpen,
}: {
	roadmap: Roadmap
	onBack: () => void
	onOpen: (id: string) => void
}) {
	const books = useLibrary((s) => s.books)
	const readings = useLibrary((s) => s.readings)
	const updateRoadmap = useLibrary((s) => s.updateRoadmap)
	const removeRoadmap = useLibrary((s) => s.removeRoadmap)
	const addStage = useLibrary((s) => s.addStage)
	const updateStage = useLibrary((s) => s.updateStage)
	const removeStage = useLibrary((s) => s.removeStage)
	const moveStage = useLibrary((s) => s.moveStage)
	const moveBookInRoadmap = useLibrary((s) => s.moveBookInRoadmap)
	const setStatus = useLibrary((s) => s.setStatus)

	const [confirmDelete, setConfirmDelete] = useState(false)
	const [pickerStage, setPickerStage] = useState<string | null>(null)
	const [adding, setAdding] = useState(false)
	const [stageTitle, setStageTitle] = useState("")
	const [stageDate, setStageDate] = useState("")
	const [draggedBook, setDraggedBook] = useState<Book | null>(null)
	const [overStage, setOverStage] = useState<string | null>(null)

	const now = today()
	const doneIds = useMemo(
		() =>
			new Set(readings.filter((r) => r.status === "done").map((r) => r.bookId)),
		[readings],
	)
	const bookById = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])
	const readingByBook = useMemo(
		() => new Map(readings.map((r) => [r.bookId, r])),
		[readings],
	)

	const states = roadmap.stages.map((s) => stageState(s, doneIds, now))
	const total = states.reduce((a, s) => a + s.total, 0)
	const done = states.reduce((a, s) => a + s.done, 0)

	const submitStage = () => {
		const t = stageTitle.trim()
		if (!t) return
		addStage(roadmap.id, { title: t, targetDate: stageDate || undefined })
		setStageTitle("")
		setStageDate("")
		setAdding(false)
	}

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	)

	const onDragStart = (e: DragStartEvent) => {
		const id = String(e.active.id)
		if (!id.startsWith("book:")) return
		setDraggedBook(bookById.get(id.split(":")[2]) ?? null)
	}

	const onDragOver = (e: DragOverEvent) => {
		if (!String(e.active.id).startsWith("book:")) return
		setOverStage(e.over ? stageOfDroppable(String(e.over.id)) : null)
	}

	const onDragCancel = () => {
		setDraggedBook(null)
		setOverStage(null)
	}

	const onDragEnd = (e: DragEndEvent) => {
		const { active, over } = e
		onDragCancel()
		if (!over) return
		const from = String(active.id)
		const to = String(over.id)

		if (from.startsWith("stage:")) {
			if (!to.startsWith("stage:") || from === to) return
			const fromIndex = roadmap.stages.findIndex(
				(s) => stageDragId(s.id) === from,
			)
			const toIndex = roadmap.stages.findIndex((s) => stageDragId(s.id) === to)
			if (fromIndex === -1 || toIndex === -1) return
			moveStage(roadmap.id, fromIndex, toIndex)
			return
		}

		if (!from.startsWith("book:")) return
		const [, fromStageId, bookId] = from.split(":")
		const toStageId = stageOfDroppable(to)
		if (!toStageId) return
		const target = roadmap.stages.find((s) => s.id === toStageId)
		if (!target) return

		const sameStage = fromStageId === toStageId
		let toIndex = sameStage ? target.bookIds.length - 1 : target.bookIds.length

		if (to.startsWith("book:")) {
			const overIndex = target.bookIds.indexOf(to.split(":")[2])
			if (overIndex === -1) return
			const currentIndex = target.bookIds.indexOf(bookId)
			toIndex =
				sameStage && currentIndex !== -1 && currentIndex < overIndex
					? overIndex - 1
					: overIndex
		}

		if (sameStage && target.bookIds[toIndex] === bookId) return
		moveBookInRoadmap(roadmap.id, bookId, toStageId, toIndex)
	}

	return (
		<>
			<div className="flex items-center justify-between mb-5">
				<Button
					variant="ghost"
					size="sm"
					icon={<ArrowLeft size={15} />}
					onClick={onBack}
				>
					Усі роудмапи
				</Button>
				{confirmDelete ? (
					<div className="flex items-center gap-2">
						<span className="text-xs text-ink-2">
							Видалити роудмап назавжди?
						</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setConfirmDelete(false)}
						>
							Ні
						</Button>
						<Button
							variant="danger"
							size="sm"
							onClick={() => {
								removeRoadmap(roadmap.id)
								onBack()
							}}
						>
							Так, видалити
						</Button>
					</div>
				) : (
					<Button
						variant="ghost"
						size="sm"
						icon={<Trash2 size={15} />}
						onClick={() => setConfirmDelete(true)}
					>
						Видалити
					</Button>
				)}
			</div>

			<div className="mb-8">
				<InlineEdit
					value={roadmap.title}
					onSave={(v) => v && updateRoadmap(roadmap.id, { title: v })}
					placeholder="Назва роудмапу"
					className="font-serif text-3xl font-semibold tracking-tight"
				/>
				<InlineEdit
					multiline
					value={roadmap.description ?? ""}
					onSave={(v) =>
						updateRoadmap(roadmap.id, { description: v || undefined })
					}
					placeholder="Додати опис…"
					className="text-sm text-ink-2 mt-2 max-w-2xl"
				/>
				{roadmap.stages.length > 0 && (
					<div className="mt-5 max-w-md">
						<div className="flex items-baseline justify-between text-xs text-ink-2 mb-1.5">
							<span>Загальний прогрес</span>
							<span className="tabular-nums">
								{done} / {total}
							</span>
						</div>
						<Progress value={total ? (done / total) * 100 : 0} />
					</div>
				)}
			</div>

			<div className="relative">
				<DndContext
					sensors={sensors}
					collisionDetection={byActiveKind}
					onDragStart={onDragStart}
					onDragOver={onDragOver}
					onDragEnd={onDragEnd}
					onDragCancel={onDragCancel}
				>
					<SortableContext
						items={roadmap.stages.map((s) => stageDragId(s.id))}
						strategy={verticalListSortingStrategy}
					>
						{roadmap.stages.map((stage, i) => (
							<StageRow
								key={stage.id}
								roadmapId={roadmap.id}
								stage={stage}
								index={i}
								last={i === roadmap.stages.length - 1}
								st={states[i]}
								bookById={bookById}
								readingByBook={readingByBook}
								dragging={!!draggedBook}
								dropTarget={!!draggedBook && overStage === stage.id}
								onOpen={onOpen}
								onStatus={setStatus}
								onUpdateStage={updateStage}
								onRemoveStage={removeStage}
								onPick={setPickerStage}
							/>
						))}
					</SortableContext>

					<DragOverlay dropAnimation={null}>
						{draggedBook && (
							<div className="flex items-center gap-3 rounded-lg bg-panel border border-accent shadow-lg px-3 py-2">
								<Cover book={draggedBook} size="sm" />
								<div className="text-sm text-ink truncate max-w-56">
									{draggedBook.title}
								</div>
							</div>
						)}
					</DragOverlay>
				</DndContext>

				<div className="flex gap-3">
					<div className="w-4 shrink-0" />
					<div className="w-8 shrink-0 flex justify-center">
						<div className="w-8 h-8 rounded-full border-2 border-dashed border-line flex items-center justify-center text-ink-3">
							<Plus size={14} />
						</div>
					</div>
					<div className="flex-1 min-w-0">
						{adding ? (
							<div className="bg-panel border border-line rounded-xl p-5 space-y-3">
								<Field label="Назва етапу">
									<Input
										autoFocus
										value={stageTitle}
										onChange={(e) => setStageTitle(e.target.value)}
										placeholder="Наприклад: Фундамент"
										onKeyDown={(e) => e.key === "Enter" && submitStage()}
									/>
								</Field>
								<Field label="Дедлайн (необовʼязково)">
									<Input
										type="date"
										value={stageDate}
										onChange={(e) => setStageDate(e.target.value)}
									/>
								</Field>
								<div className="flex justify-end gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setAdding(false)}
									>
										Скасувати
									</Button>
									<Button
										variant="primary"
										size="sm"
										onClick={submitStage}
										disabled={!stageTitle.trim()}
									>
										Додати
									</Button>
								</div>
							</div>
						) : (
							<Button
								variant="soft"
								icon={<Plus size={15} />}
								onClick={() => setAdding(true)}
							>
								Додати етап
							</Button>
						)}
					</div>
				</div>
			</div>

			<BookPicker
				open={!!pickerStage}
				onClose={() => setPickerStage(null)}
				stage={roadmap.stages.find((s) => s.id === pickerStage)}
				onPick={(bookId) => {
					const stage = roadmap.stages.find((s) => s.id === pickerStage)
					if (!stage) return
					updateStage(roadmap.id, stage.id, {
						bookIds: [...stage.bookIds, bookId],
					})
				}}
			/>
		</>
	)
}

function StageRow({
	roadmapId,
	stage,
	index,
	last,
	st,
	bookById,
	readingByBook,
	dragging,
	dropTarget,
	onOpen,
	onStatus,
	onUpdateStage,
	onRemoveStage,
	onPick,
}: {
	roadmapId: string
	stage: Stage
	index: number
	last: boolean
	st: StageState
	bookById: Map<string, Book>
	readingByBook: Map<string, Reading>
	dragging: boolean
	dropTarget: boolean
	onOpen: (id: string) => void
	onStatus: (bookId: string, status: "reading" | "done") => void
	onUpdateStage: (
		roadmapId: string,
		stageId: string,
		patch: Partial<Stage>,
	) => void
	onRemoveStage: (roadmapId: string, stageId: string) => void
	onPick: (stageId: string) => void
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: stageDragId(stage.id),
	})
	const { setNodeRef: setListRef } = useDroppable({ id: stageDropId(stage.id) })

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cx(isDragging && "opacity-40 relative z-10")}
		>
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25, delay: index * 0.05 }}
				className="flex gap-3"
			>
				<button
					{...attributes}
					{...listeners}
					className="mt-1 shrink-0 text-ink-3 hover:text-ink cursor-grab active:cursor-grabbing touch-none"
					title="Перетягнути етап"
					aria-label="Перетягнути етап"
				>
					<GripVertical size={16} />
				</button>

				<div className="relative w-8 shrink-0 flex flex-col items-center">
					<div
						className={cx(
							"w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 z-10 transition-colors",
							st.complete
								? "bg-accent text-white"
								: "bg-panel border-2 border-line text-ink-3",
						)}
					>
						{st.complete ? <Check size={15} /> : index + 1}
					</div>
					{!last && <div className="w-px flex-1 bg-line my-1" />}
				</div>

				<div
					className={cx(
						"flex-1 min-w-0 bg-panel border border-line rounded-xl p-5 transition-shadow",
						dropTarget && "ring-1 ring-accent/50",
						last ? "mb-4" : "mb-6",
					)}
				>
					<div className="flex items-start gap-3">
						<div className="flex-1 min-w-0">
							<InlineEdit
								value={stage.title}
								onSave={(v) =>
									v && onUpdateStage(roadmapId, stage.id, { title: v })
								}
								placeholder="Назва етапу"
								className="font-serif text-lg font-semibold"
							/>
							<div className="flex flex-wrap items-center gap-2 mt-2">
								<input
									type="date"
									value={stage.targetDate ?? ""}
									onChange={(e) =>
										onUpdateStage(roadmapId, stage.id, {
											targetDate: e.target.value || undefined,
										})
									}
									className="rounded-lg bg-panel-2 border border-line px-2.5 py-1 text-xs text-ink-2 outline-none focus:border-accent transition"
								/>
								{st.overdue && (
									<span className="rounded-full bg-danger/15 text-danger px-2 py-0.5 text-[11px] font-medium">
										Прострочено
									</span>
								)}
								{st.soon && (
									<span className="rounded-full bg-warn/15 text-warn px-2 py-0.5 text-[11px] font-medium">
										Дедлайн близько
									</span>
								)}
							</div>
						</div>

						<Button
							variant="danger"
							size="sm"
							className="shrink-0"
							onClick={() => onRemoveStage(roadmapId, stage.id)}
							title="Видалити етап"
						>
							<Trash2 size={15} />
						</Button>
					</div>

					<div className="mt-4">
						<div className="flex items-baseline justify-between text-xs text-ink-2 mb-1.5">
							<span>Прочитано</span>
							<span className="tabular-nums">
								{st.done} / {st.total}
							</span>
						</div>
						<Progress value={st.total ? (st.done / st.total) * 100 : 0} />
					</div>

					<div ref={setListRef} className="mt-4 space-y-1">
						<SortableContext
							items={stage.bookIds.map((id) => bookDragId(stage.id, id))}
							strategy={verticalListSortingStrategy}
						>
							{stage.bookIds.length === 0 && (
								<div
									className={cx(
										"text-xs text-ink-3 py-2",
										dragging &&
											"rounded-lg border border-dashed border-line px-3 text-center",
									)}
								>
									{dragging
										? "Перетягни книгу сюди"
										: "Жодної книги на цьому етапі"}
								</div>
							)}
							{stage.bookIds.map((id) => {
								const book = bookById.get(id)
								if (!book) return null
								return (
									<StageBook
										key={id}
										dragId={bookDragId(stage.id, id)}
										book={book}
										reading={readingByBook.get(id)}
										onOpen={onOpen}
										onStatus={onStatus}
										onRemove={() =>
											onUpdateStage(roadmapId, stage.id, {
												bookIds: stage.bookIds.filter((x) => x !== id),
											})
										}
									/>
								)
							})}
						</SortableContext>
					</div>

					<Button
						variant="ghost"
						size="sm"
						icon={<Plus size={14} />}
						className="mt-3"
						onClick={() => onPick(stage.id)}
					>
						Додати книгу
					</Button>
				</div>
			</motion.div>
		</div>
	)
}

function StageBook({
	dragId,
	book,
	reading,
	onOpen,
	onStatus,
	onRemove,
}: {
	dragId: string
	book: Book
	reading: Reading | undefined
	onOpen: (id: string) => void
	onStatus: (bookId: string, status: "reading" | "done") => void
	onRemove: () => void
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: dragId })
	const status = reading?.status ?? "planned"
	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cx(
				"group flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-panel-2 transition",
				isDragging && "opacity-40",
			)}
		>
			<button
				{...attributes}
				{...listeners}
				className="shrink-0 text-ink-3 hover:text-ink cursor-grab active:cursor-grabbing touch-none"
				title="Перетягнути книгу"
				aria-label="Перетягнути книгу"
			>
				<GripVertical size={16} />
			</button>
			<Cover book={book} size="sm" />
			<button
				type="button"
				onClick={() => onOpen(book.id)}
				className="flex-1 min-w-0 text-left"
			>
				<div className="text-sm text-ink truncate group-hover:text-accent transition">
					{book.title}
				</div>
				<div className="text-xs text-ink-3 truncate">{book.author}</div>
			</button>
			<StatusBadge status={status} />
			<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
				{status !== "reading" && status !== "done" && (
					<Button
						variant="ghost"
						size="sm"
						icon={<Play size={13} />}
						onClick={() => onStatus(book.id, "reading")}
					>
						Почати
					</Button>
				)}
				{status !== "done" && (
					<Button
						variant="ghost"
						size="sm"
						icon={<Check size={13} />}
						onClick={() => onStatus(book.id, "done")}
					>
						Завершено
					</Button>
				)}
				<Button
					variant="danger"
					size="sm"
					onClick={onRemove}
					title="Прибрати з етапу"
				>
					<X size={14} />
				</Button>
			</div>
		</div>
	)
}

function BookPicker({
	open,
	onClose,
	stage,
	onPick,
}: {
	open: boolean
	onClose: () => void
	stage: Stage | undefined
	onPick: (bookId: string) => void
}) {
	const books = useLibrary((s) => s.books)
	const addBook = useLibrary((s) => s.addBook)
	const [q, setQ] = useState("")
	const [newTitle, setNewTitle] = useState("")
	const [newAuthor, setNewAuthor] = useState("")

	const inStage = new Set(stage?.bookIds ?? [])
	const needle = q.trim().toLowerCase()
	const list = books.filter(
		(b) =>
			!inStage.has(b.id) &&
			(!needle ||
				b.title.toLowerCase().includes(needle) ||
				b.author.toLowerCase().includes(needle)),
	)

	const close = () => {
		setQ("")
		setNewTitle("")
		setNewAuthor("")
		onClose()
	}

	const createAndAdd = () => {
		const t = newTitle.trim()
		if (!t) return
		const book = addBook({ title: t, author: newAuthor.trim() }, "planned")
		onPick(book.id)
		setNewTitle("")
		setNewAuthor("")
		close()
	}

	return (
		<Modal open={open} onClose={close} title="Додати книгу до етапу">
			<div className="space-y-4">
				<div className="relative">
					<Search
						size={15}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
					/>
					<Input
						autoFocus
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Пошук у бібліотеці"
						className="pl-9"
					/>
				</div>

				<div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1">
					{list.length === 0 ? (
						<div className="text-sm text-ink-3 py-6 text-center">
							{books.length === 0 ? "Бібліотека порожня" : "Нічого не знайдено"}
						</div>
					) : (
						list.map((b) => (
							<button
								key={b.id}
								type="button"
								onClick={() => {
									onPick(b.id)
									close()
								}}
								className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-panel-2 transition"
							>
								<Cover book={b} size="sm" />
								<div className="flex-1 min-w-0">
									<div className="text-sm text-ink truncate">{b.title}</div>
									<div className="text-xs text-ink-3 truncate">{b.author}</div>
								</div>
								<Plus size={15} className="text-ink-3 shrink-0" />
							</button>
						))
					)}
				</div>

				<div className="border-t border-line pt-4">
					<div className="text-xs font-medium text-ink-2 mb-2">
						Немає в бібліотеці — створити нову
					</div>
					<div className="flex gap-2">
						<Input
							value={newTitle}
							onChange={(e) => setNewTitle(e.target.value)}
							placeholder="Назва"
						/>
						<Input
							value={newAuthor}
							onChange={(e) => setNewAuthor(e.target.value)}
							placeholder="Автор"
						/>
						<Button
							variant="primary"
							onClick={createAndAdd}
							disabled={!newTitle.trim()}
						>
							Додати
						</Button>
					</div>
				</div>
			</div>
		</Modal>
	)
}

function InlineEdit({
	value,
	onSave,
	placeholder,
	className,
	multiline,
}: {
	value: string
	onSave: (v: string) => void
	placeholder?: string
	className?: string
	multiline?: boolean
}) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(value)

	const start = () => {
		setDraft(value)
		setEditing(true)
	}
	const commit = () => {
		setEditing(false)
		const next = draft.trim()
		if (next !== value) onSave(next)
	}

	if (editing)
		return multiline ? (
			<Textarea
				autoFocus
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				placeholder={placeholder}
				className={className}
			/>
		) : (
			<Input
				autoFocus
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === "Enter") e.currentTarget.blur()
					if (e.key === "Escape") setEditing(false)
				}}
				placeholder={placeholder}
				className={className}
			/>
		)

	return (
		<button
			type="button"
			onClick={start}
			className={cx(
				"block w-full text-left cursor-text rounded-lg -mx-2 px-2 py-0.5 hover:bg-panel-2 transition whitespace-pre-wrap",
				!value && "text-ink-3",
				className,
			)}
		>
			{value || placeholder}
		</button>
	)
}
