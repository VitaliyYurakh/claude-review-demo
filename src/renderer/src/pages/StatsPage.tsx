import type { Book, Reading } from "@shared/types"
import { motion } from "framer-motion"
import {
	BarChart3,
	BookMarked,
	BookOpen,
	Clock,
	FileText,
	Layers,
	Star,
	Tag,
	Target,
	Trophy,
	Users,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import { Cover, cx, Empty, PageHeader, Progress, Stars } from "@/components/ui"
import { useLibrary } from "@/store/library"

const MONTHS = [
	"січ",
	"лют",
	"бер",
	"кві",
	"тра",
	"чер",
	"лип",
	"сер",
	"вер",
	"жов",
	"лис",
	"гру",
]

const plural = (n: number, one: string, few: string, many: string) => {
	const m10 = n % 10
	const m100 = n % 100
	if (m10 === 1 && m100 !== 11) return one
	if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
	return many
}

const yearOf = (d: string) => Number(d.slice(0, 4))
const monthOf = (d: string) => Number(d.slice(5, 7)) - 1

const tooltipStyle = {
	background: "var(--panel)",
	border: "1px solid var(--line)",
	borderRadius: 12,
	boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
	fontSize: 12,
	padding: "8px 12px",
}

function Card({
	className,
	children,
}: {
	className?: string
	children: React.ReactNode
}) {
	return (
		<div className={cx("bg-panel border border-line rounded-xl", className)}>
			{children}
		</div>
	)
}

function Tile({
	icon,
	label,
	value,
	hint,
}: {
	icon: React.ReactNode
	label: string
	value: string
	hint?: string
}) {
	return (
		<Card className="p-5">
			<div className="flex items-center gap-2 text-ink-3 mb-3">
				{icon}
				<span className="text-xs font-medium uppercase tracking-wide">
					{label}
				</span>
			</div>
			<div className="font-serif text-3xl font-semibold tracking-tight">
				{value}
			</div>
			{hint && <div className="text-xs text-ink-3 mt-1">{hint}</div>}
		</Card>
	)
}

function SectionTitle({
	icon,
	children,
}: {
	icon: React.ReactNode
	children: React.ReactNode
}) {
	return (
		<div className="flex items-center gap-2 mb-4">
			<span className="text-accent">{icon}</span>
			<h2 className="font-serif text-lg font-semibold">{children}</h2>
		</div>
	)
}

export default function StatsPage({
	onOpen,
}: {
	onOpen: (id: string) => void
}) {
	const books = useLibrary((s) => s.books)
	const readings = useLibrary((s) => s.readings)
	const yearlyGoal = useLibrary((s) => s.settings.yearlyGoal)

	const currentYear = new Date().getFullYear()
	const [year, setYear] = useState(currentYear)

	const doneAll = useMemo(
		() =>
			readings.filter(
				(r): r is Reading & { finishedAt: string } =>
					r.status === "done" && !!r.finishedAt,
			),
		[readings],
	)

	const years = useMemo(() => {
		const set = new Set<number>(doneAll.map((r) => yearOf(r.finishedAt)))
		set.add(currentYear)
		return [...set].sort((a, b) => b - a)
	}, [doneAll, currentYear])

	const byId = useMemo(
		() => new Map<string, Book>(books.map((b) => [b.id, b])),
		[books],
	)

	const stats = useMemo(() => {
		const list = doneAll
			.filter((r) => yearOf(r.finishedAt) === year)
			.map((r) => ({ reading: r, book: byId.get(r.bookId) }))
			.filter(
				(x): x is { reading: Reading & { finishedAt: string }; book: Book } =>
					!!x.book,
			)

		const pages = list.reduce((a, x) => a + (x.book.pages ?? 0), 0)
		const rated = list.filter((x) => (x.reading.rating ?? 0) > 0)
		const avgRating = rated.length
			? rated.reduce((a, x) => a + (x.reading.rating ?? 0), 0) / rated.length
			: 0

		const spans = list
			.filter((x) => x.reading.startedAt)
			.map(
				(x) =>
					(Date.parse(x.reading.finishedAt) -
						Date.parse(x.reading.startedAt ?? "")) /
					86400000,
			)
			.filter((d) => Number.isFinite(d) && d >= 0)
		const avgDays = spans.length
			? spans.reduce((a, d) => a + Math.max(1, d), 0) / spans.length
			: 0

		const months = MONTHS.map((m) => ({ month: m, books: 0, pages: 0 }))
		for (const x of list) {
			const i = monthOf(x.reading.finishedAt)
			if (i < 0 || i > 11) continue
			months[i].books += 1
			months[i].pages += x.book.pages ?? 0
		}

		const genreMap = new Map<string, number>()
		for (const x of list) {
			const g = x.book.genre?.trim() || "Без жанру"
			genreMap.set(g, (genreMap.get(g) ?? 0) + 1)
		}
		const genres = [...genreMap.entries()]
			.map(([name, count]) => ({
				name,
				count,
				percent: list.length ? (count / list.length) * 100 : 0,
			}))
			.sort((a, b) => b.count - a.count)

		const authorMap = new Map<
			string,
			{ count: number; sum: number; rated: number }
		>()
		for (const x of list) {
			const a = x.book.author?.trim() || "Невідомий автор"
			const prev = authorMap.get(a) ?? { count: 0, sum: 0, rated: 0 }
			const rating = x.reading.rating ?? 0
			authorMap.set(a, {
				count: prev.count + 1,
				sum: prev.sum + rating,
				rated: prev.rated + (rating > 0 ? 1 : 0),
			})
		}
		const authors = [...authorMap.entries()]
			.map(([name, v]) => ({
				name,
				count: v.count,
				avg: v.rated ? v.sum / v.rated : 0,
			}))
			.sort((a, b) => b.count - a.count || b.avg - a.avg)
			.slice(0, 6)

		const best = rated
			.slice()
			.sort((a, b) => (b.reading.rating ?? 0) - (a.reading.rating ?? 0))
			.slice(0, 5)

		const longest = list.reduce<(typeof list)[number] | undefined>(
			(max, x) => ((x.book.pages ?? 0) > (max?.book.pages ?? 0) ? x : max),
			undefined,
		)

		return {
			list,
			pages,
			avgRating,
			avgDays,
			months,
			genres,
			authors,
			best,
			longest,
		}
	}, [doneAll, byId, year])

	const pagesInProgress = useMemo(
		() =>
			readings
				.filter((r) => r.status === "reading")
				.reduce((a, r) => {
					const total = byId.get(r.bookId)?.pages
					const page = r.currentPage ?? 0
					return a + (total ? Math.min(page, total) : page)
				}, 0),
		[readings, byId],
	)
	const pagesTotal = stats.pages + (year === currentYear ? pagesInProgress : 0)

	const done = stats.list.length
	const goal = Math.max(1, yearlyGoal)
	const progress = (done / goal) * 100

	const paceRatio =
		year < currentYear
			? 1
			: year > currentYear
				? 0
				: (Date.now() - Date.parse(`${currentYear}-01-01`)) /
					(Date.parse(`${currentYear + 1}-01-01`) -
						Date.parse(`${currentYear}-01-01`))
	const expected = goal * paceRatio
	const delta = Math.round(done - expected)
	const paceText =
		delta === 0
			? "Точно за графіком"
			: delta > 0
				? `Випереджаєш на ${delta} ${plural(delta, "книгу", "книги", "книг")}`
				: `Відстаєш на ${-delta} ${plural(-delta, "книгу", "книги", "книг")}`

	if (doneAll.length === 0)
		return (
			<>
				<PageHeader title="Статистика" subtitle="Твій читацький рік у цифрах" />
				<Empty
					icon={<BarChart3 size={40} />}
					title="Ще немає прочитаних книг"
					hint="Познач книгу як прочитану — і тут з'явиться статистика за рік."
				/>
			</>
		)

	return (
		<div className="space-y-6">
			<PageHeader
				title="Статистика"
				subtitle="Твій читацький рік у цифрах"
				actions={
					<div className="flex gap-1.5">
						{years.map((y) => (
							<button
								type="button"
								key={y}
								onClick={() => setYear(y)}
								className={cx(
									"px-3 py-1.5 rounded-full text-sm font-medium border transition",
									y === year
										? "bg-accent text-white border-accent shadow-sm"
										: "bg-panel text-ink-2 border-line hover:text-ink hover:border-ink-3",
								)}
							>
								{y}
							</button>
						))}
					</div>
				}
			/>

			<motion.div
				className="grid grid-cols-3 gap-4"
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25 }}
			>
				<Tile
					icon={<BookOpen size={15} />}
					label="Прочитано"
					value={String(done)}
					hint={`за ${year} рік`}
				/>
				<Tile
					icon={<FileText size={15} />}
					label="Сторінок"
					value={pagesTotal.toLocaleString("uk-UA")}
					hint={
						done ? `≈ ${Math.round(stats.pages / done)} на книгу` : undefined
					}
				/>
				<Tile
					icon={<Layers size={15} />}
					label="Середньо сторінок на книжку"
					value={done ? String(Math.round(stats.pages / done)) : "—"}
					hint={done ? `за ${year} рік` : "ще немає прочитаних"}
				/>
				<Tile
					icon={<Star size={15} />}
					label="Середня оцінка"
					value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
					hint={stats.avgRating ? "з 5 зірок" : "ще немає оцінок"}
				/>
				<Tile
					icon={<Clock size={15} />}
					label="Днів на книгу"
					value={stats.avgDays ? String(Math.round(stats.avgDays)) : "—"}
					hint={stats.avgDays ? "у середньому" : "немає дат початку"}
				/>
				<Tile
					icon={<BookMarked size={15} />}
					label="Найдовша книжка року"
					value={
						stats.longest
							? `${(stats.longest.book.pages ?? 0).toLocaleString("uk-UA")} стор.`
							: "—"
					}
					hint={
						stats.longest
							? stats.longest.book.title
							: "немає даних про сторінки"
					}
				/>
			</motion.div>

			<Card className="p-6">
				<div className="flex items-end justify-between mb-4">
					<SectionTitle icon={<Target size={16} />}>Річна ціль</SectionTitle>
					<div className="text-sm text-ink-2 mb-4">
						<span className="font-serif text-2xl font-semibold text-ink">
							{done}
						</span>
						<span className="mx-1.5 text-ink-3">з</span>
						<span className="text-ink">{goal}</span>
					</div>
				</div>
				<Progress value={progress} className="h-2.5" />
				<div className="flex items-center justify-between mt-3 text-xs">
					<span className={cx(delta >= 0 ? "text-ok" : "text-warn")}>
						{paceText}
					</span>
					<span className="text-ink-3">{Math.round(progress)}%</span>
				</div>
			</Card>

			<Card className="p-6">
				<SectionTitle icon={<BarChart3 size={16} />}>
					Книги за місяцями
				</SectionTitle>
				<div className="h-64">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={stats.months}
							margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
						>
							<CartesianGrid
								vertical={false}
								stroke="var(--line)"
								strokeDasharray="3 3"
							/>
							<XAxis
								dataKey="month"
								tickLine={false}
								axisLine={false}
								tick={{ fill: "var(--ink-3)", fontSize: 11 }}
							/>
							<YAxis
								allowDecimals={false}
								tickLine={false}
								axisLine={false}
								tick={{ fill: "var(--ink-3)", fontSize: 11 }}
							/>
							<Tooltip
								cursor={{ fill: "var(--panel-2)" }}
								contentStyle={tooltipStyle}
								labelStyle={{ color: "var(--ink-2)", marginBottom: 4 }}
								itemStyle={{ color: "var(--ink)" }}
								formatter={(v) => [String(v), "книг"]}
							/>
							<Bar
								dataKey="books"
								fill="var(--accent)"
								radius={[6, 6, 0, 0]}
								maxBarSize={34}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</Card>

			<Card className="p-6">
				<SectionTitle icon={<FileText size={16} />}>
					Сторінки за місяцями
				</SectionTitle>
				<div className="h-56">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={stats.months}
							margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
						>
							<defs>
								<linearGradient id="pagesGradient" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="0%"
										stopColor="var(--accent-2)"
										stopOpacity={0.45}
									/>
									<stop
										offset="100%"
										stopColor="var(--accent-2)"
										stopOpacity={0}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid
								vertical={false}
								stroke="var(--line)"
								strokeDasharray="3 3"
							/>
							<XAxis
								dataKey="month"
								tickLine={false}
								axisLine={false}
								tick={{ fill: "var(--ink-3)", fontSize: 11 }}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tick={{ fill: "var(--ink-3)", fontSize: 11 }}
								width={44}
							/>
							<Tooltip
								cursor={{ stroke: "var(--line)" }}
								contentStyle={tooltipStyle}
								labelStyle={{ color: "var(--ink-2)", marginBottom: 4 }}
								itemStyle={{ color: "var(--ink)" }}
								formatter={(v) => [String(v), "сторінок"]}
							/>
							<Area
								type="monotone"
								dataKey="pages"
								stroke="var(--accent-2)"
								strokeWidth={2}
								fill="url(#pagesGradient)"
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</Card>

			<div className="grid grid-cols-2 gap-6">
				<Card className="p-6">
					<SectionTitle icon={<Tag size={16} />}>Жанри</SectionTitle>
					{stats.genres.length === 0 ? (
						<div className="text-sm text-ink-3">Немає даних за цей рік</div>
					) : (
						<div className="space-y-3">
							{stats.genres.map((g) => (
								<div key={g.name}>
									<div className="flex items-baseline justify-between text-sm mb-1">
										<span className="text-ink truncate">{g.name}</span>
										<span className="text-ink-3 text-xs shrink-0 ml-3">
											{g.count} · {Math.round(g.percent)}%
										</span>
									</div>
									<div className="h-1.5 rounded-full bg-line overflow-hidden">
										<motion.div
											className="h-full bg-accent rounded-full"
											initial={{ width: 0 }}
											animate={{ width: `${g.percent}%` }}
											transition={{ duration: 0.5, ease: "easeOut" }}
										/>
									</div>
								</div>
							))}
						</div>
					)}
				</Card>

				<Card className="p-6">
					<SectionTitle icon={<Users size={16} />}>Топ авторів</SectionTitle>
					{stats.authors.length === 0 ? (
						<div className="text-sm text-ink-3">Немає даних за цей рік</div>
					) : (
						<div className="space-y-3">
							{stats.authors.map((a) => (
								<div
									key={a.name}
									className="flex items-center justify-between gap-3"
								>
									<div className="min-w-0">
										<div className="text-sm text-ink truncate">{a.name}</div>
										<div className="text-xs text-ink-3">
											{a.count} {plural(a.count, "книга", "книги", "книг")}
										</div>
									</div>
									<div className="shrink-0 flex items-center gap-2">
										<Stars value={Math.round(a.avg)} size={13} />
										<span className="text-xs text-ink-3 w-6 text-right">
											{a.avg ? a.avg.toFixed(1) : "—"}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</Card>
			</div>

			<Card className="p-6">
				<SectionTitle icon={<Trophy size={16} />}>
					Найкращі цього року
				</SectionTitle>
				{stats.best.length === 0 ? (
					<div className="text-sm text-ink-3">
						Ще немає оцінених книг за {year} рік
					</div>
				) : (
					<div className="grid grid-cols-5 gap-4">
						{stats.best.map(({ book, reading }) => (
							<button
								type="button"
								key={book.id}
								onClick={() => onOpen(book.id)}
								className="text-left group rounded-lg p-2 -m-2 transition hover:bg-panel-2"
							>
								<Cover
									book={book}
									className="mb-2 transition group-hover:shadow-lg group-hover:-translate-y-0.5"
								/>
								<div className="font-serif text-sm text-ink leading-tight line-clamp-2">
									{book.title}
								</div>
								<div className="text-xs text-ink-3 truncate mt-0.5">
									{book.author}
								</div>
								<div className="mt-1.5">
									<Stars value={reading.rating ?? 0} size={12} />
								</div>
							</button>
						))}
					</div>
				)}
			</Card>
		</div>
	)
}
