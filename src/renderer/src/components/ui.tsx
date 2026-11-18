import type { Book, ReadingStatus } from "@shared/types"
import { AnimatePresence, motion } from "framer-motion"
import { BookOpen, Star, X } from "lucide-react"
import {
	type ButtonHTMLAttributes,
	createContext,
	type InputHTMLAttributes,
	type ReactNode,
	type SelectHTMLAttributes,
	type TextareaHTMLAttributes,
	useContext,
	useId,
} from "react"
import { statusLabel } from "@/store/library"

export const cx = (...c: (string | false | undefined | null)[]) =>
	c.filter(Boolean).join(" ")

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "ghost" | "soft" | "danger"
	size?: "sm" | "md"
	icon?: ReactNode
}
export function Button({
	variant = "soft",
	size = "md",
	icon,
	className,
	children,
	...rest
}: BtnProps) {
	return (
		<button
			className={cx(
				"inline-flex items-center gap-2 rounded-lg font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
				size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
				variant === "primary" &&
					"bg-accent text-white hover:bg-accent-2 shadow-sm",
				variant === "soft" &&
					"bg-panel-2 text-ink hover:bg-line border border-line",
				variant === "ghost" && "text-ink-2 hover:text-ink hover:bg-panel-2",
				variant === "danger" && "text-danger hover:bg-danger/10",
				className,
			)}
			{...rest}
		>
			{icon}
			{children}
		</button>
	)
}

// The control inside a Field takes the id that the Field's label points to.
const FieldId = createContext<string | undefined>(undefined)

export function Input({
	className,
	...rest
}: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			id={useContext(FieldId)}
			className={cx(
				"w-full rounded-lg bg-panel-2 border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition",
				className,
			)}
			{...rest}
		/>
	)
}

export function Textarea({
	className,
	...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			id={useContext(FieldId)}
			className={cx(
				"w-full rounded-lg bg-panel-2 border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition resize-y min-h-20",
				className,
			)}
			{...rest}
		/>
	)
}

export function Select({
	className,
	...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			id={useContext(FieldId)}
			className={cx(
				"rounded-lg bg-panel-2 border border-line px-3 py-2 text-sm text-ink outline-none focus:border-accent transition",
				className,
			)}
			{...rest}
		/>
	)
}

export function Field({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	const id = useId()
	return (
		<div>
			<label
				htmlFor={id}
				className="block text-xs font-medium text-ink-2 mb-1.5"
			>
				{label}
			</label>
			<FieldId.Provider value={id}>{children}</FieldId.Provider>
		</div>
	)
}

export function Modal({
	open,
	onClose,
	title,
	children,
	wide,
}: {
	open: boolean
	onClose: () => void
	title?: string
	children: ReactNode
	wide?: boolean
}) {
	return (
		<AnimatePresence>
			{open && (
				<motion.div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onMouseDown={(e) => e.target === e.currentTarget && onClose()}
				>
					<motion.div
						className={cx(
							"bg-panel border border-line rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col",
							wide ? "max-w-4xl" : "max-w-lg",
						)}
						initial={{ scale: 0.96, y: 12, opacity: 0 }}
						animate={{ scale: 1, y: 0, opacity: 1 }}
						exit={{ scale: 0.96, y: 12, opacity: 0 }}
						transition={{ type: "spring", stiffness: 400, damping: 30 }}
					>
						{title && (
							<div className="flex items-center justify-between px-6 py-4 border-b border-line">
								<h2 className="font-serif text-lg font-semibold">{title}</h2>
								<button
									type="button"
									onClick={onClose}
									className="text-ink-3 hover:text-ink transition"
								>
									<X size={18} />
								</button>
							</div>
						)}
						<div className="overflow-y-auto p-6">{children}</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

export function Cover({
	book,
	className,
	size = "md",
}: {
	book: Book
	className?: string
	size?: "sm" | "md" | "lg"
}) {
	const dims =
		size === "sm" ? "w-10 h-14" : size === "lg" ? "w-40 h-60" : "w-24 h-36"
	const hue = [...book.title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
	return (
		<div
			className={cx(
				dims,
				"rounded-md overflow-hidden shrink-0 shadow-md relative",
				className,
			)}
		>
			{book.cover ? (
				<img src={book.cover} alt="" className="w-full h-full object-cover" />
			) : (
				<div
					className="w-full h-full flex flex-col justify-end p-2"
					style={{
						background: `linear-gradient(160deg, hsl(${hue} 45% 35%), hsl(${(hue + 40) % 360} 50% 20%))`,
					}}
				>
					{size !== "sm" && (
						<>
							<div
								className="font-serif text-white/95 leading-tight line-clamp-3"
								style={{ fontSize: size === "lg" ? 15 : 10 }}
							>
								{book.title}
							</div>
							<div
								className="text-white/60 truncate mt-1"
								style={{ fontSize: size === "lg" ? 11 : 8 }}
							>
								{book.author}
							</div>
						</>
					)}
					{size === "sm" && (
						<BookOpen size={14} className="text-white/70 m-auto" />
					)}
				</div>
			)}
		</div>
	)
}

export function Stars({
	value = 0,
	onChange,
	size = 16,
}: {
	value?: number
	onChange?: (v: number) => void
	size?: number
}) {
	return (
		<div className="inline-flex gap-0.5">
			{[1, 2, 3, 4, 5].map((n) => (
				<button
					key={n}
					type="button"
					disabled={!onChange}
					onClick={() => onChange?.(n === value ? 0 : n)}
					className={cx(
						"transition",
						onChange && "hover:scale-110",
						n <= value ? "text-accent" : "text-ink-3/50",
					)}
				>
					<Star size={size} fill={n <= value ? "currentColor" : "none"} />
				</button>
			))}
		</div>
	)
}

const statusStyle: Record<ReadingStatus, string> = {
	planned: "bg-info/15 text-info",
	reading: "bg-accent/15 text-accent",
	done: "bg-ok/15 text-ok",
	dropped: "bg-ink-3/20 text-ink-2",
}
export function StatusBadge({ status }: { status: ReadingStatus }) {
	return (
		<span
			className={cx(
				"inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
				statusStyle[status],
			)}
		>
			{statusLabel[status]}
		</span>
	)
}

export function Empty({
	icon,
	title,
	hint,
	action,
}: {
	icon: ReactNode
	title: string
	hint?: string
	action?: ReactNode
}) {
	return (
		<div className="flex flex-col items-center justify-center text-center py-20 text-ink-3">
			<div className="mb-3 opacity-60">{icon}</div>
			<div className="text-ink-2 font-medium">{title}</div>
			{hint && <div className="text-sm mt-1 max-w-xs">{hint}</div>}
			{action && <div className="mt-4">{action}</div>}
		</div>
	)
}

export function PageHeader({
	title,
	subtitle,
	actions,
}: {
	title: string
	subtitle?: string
	actions?: ReactNode
}) {
	return (
		<div className="flex items-end justify-between mb-6">
			<div>
				<h1 className="font-serif text-3xl font-semibold tracking-tight">
					{title}
				</h1>
				{subtitle && <p className="text-sm text-ink-2 mt-1">{subtitle}</p>}
			</div>
			{actions && <div className="flex gap-2">{actions}</div>}
		</div>
	)
}

export function Progress({
	value,
	className,
}: {
	value: number
	className?: string
}) {
	return (
		<div
			className={cx("h-1.5 rounded-full bg-line overflow-hidden", className)}
		>
			<motion.div
				className="h-full bg-accent rounded-full"
				initial={{ width: 0 }}
				animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
				transition={{ duration: 0.6, ease: "easeOut" }}
			/>
		</div>
	)
}

export function Markdown({ text }: { text: string }) {
	return <div className="prose-ai">{renderMarkdown(text)}</div>
}

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g

function renderInline(s: string): ReactNode[] {
	const out: ReactNode[] = []
	let last = 0
	for (const m of s.matchAll(INLINE)) {
		if (m.index > last) out.push(s.slice(last, m.index))
		if (m[1] !== undefined) out.push(<strong key={m.index}>{m[1]}</strong>)
		else if (m[2] !== undefined) out.push(<em key={m.index}>{m[2]}</em>)
		else out.push(<code key={m.index}>{m[3]}</code>)
		last = m.index + m[0].length
	}
	if (last < s.length) out.push(s.slice(last))
	return out
}

function renderMarkdown(md: string): ReactNode[] {
	const blocks: ReactNode[] = []
	const state: { list: { ordered: boolean; items: ReactNode[] } | null } = {
		list: null,
	}
	const closeList = (key: number) => {
		const { list } = state
		if (!list) return
		blocks.push(
			list.ordered ? (
				<ol key={key}>{list.items}</ol>
			) : (
				<ul key={key}>{list.items}</ul>
			),
		)
		state.list = null
	}
	const lines = md.split("\n")
	for (let n = 0; n < lines.length; n++) {
		const line = lines[n].trimEnd()
		const h = /^(#{1,3})\s+(.*)/.exec(line)
		const ul = /^\s*[-*•]\s+(.*)/.exec(line)
		const ol = /^\s*\d+[.)]\s+(.*)/.exec(line)
		const bq = /^>\s?(.*)/.exec(line)
		const item = ul ?? ol
		if (item) {
			const ordered = !ul
			if (state.list?.ordered !== ordered) {
				closeList(n)
				state.list = { ordered, items: [] }
			}
			state.list.items.push(<li key={n}>{renderInline(item[1])}</li>)
			continue
		}
		closeList(n)
		if (h) {
			const Tag = (["h2", "h3", "h4"] as const)[h[1].length - 1]
			blocks.push(<Tag key={n}>{renderInline(h[2])}</Tag>)
		} else if (bq) {
			blocks.push(<blockquote key={n}>{renderInline(bq[1])}</blockquote>)
		} else if (line.trim()) {
			blocks.push(<p key={n}>{renderInline(line)}</p>)
		}
	}
	closeList(lines.length)
	return blocks
}
