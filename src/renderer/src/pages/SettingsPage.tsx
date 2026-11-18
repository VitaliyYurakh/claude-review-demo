import type { Settings } from "@shared/types"
import { motion } from "framer-motion"
import {
	AlertCircle,
	CheckCircle2,
	Database,
	Download,
	Info,
	Loader2,
	Moon,
	Palette,
	Sun,
	Target,
	Terminal,
	Upload,
} from "lucide-react"
import { useState } from "react"
import { Button, cx, Field, Input, PageHeader } from "@/components/ui"
import { useLibrary } from "@/store/library"

const APP_VERSION = "1.0.0"

const themes: {
	id: Settings["theme"]
	label: string
	icon: typeof Sun
	swatches: string[]
}[] = [
	{
		id: "dark",
		label: "Темна",
		icon: Moon,
		swatches: ["#0f0f13", "#1a1a22", "#2a2a36", "#f59e0b"],
	},
	{
		id: "light",
		label: "Світла",
		icon: Sun,
		swatches: ["#f6f3ee", "#ffffff", "#e4ddd2", "#c2410c"],
	},
]

function Card({
	icon,
	title,
	hint,
	children,
}: {
	icon: React.ReactNode
	title: string
	hint?: string
	children: React.ReactNode
}) {
	return (
		<section className="bg-panel border border-line rounded-xl p-6">
			<div className="flex items-center gap-2 mb-1">
				<span className="text-accent">{icon}</span>
				<h2 className="font-serif text-lg font-semibold">{title}</h2>
			</div>
			{hint && <p className="text-sm text-ink-3 mb-4">{hint}</p>}
			<div className={cx(hint ? "" : "mt-4")}>{children}</div>
		</section>
	)
}

export default function SettingsPage() {
	const settings = useLibrary((s) => s.settings)
	const updateSettings = useLibrary((s) => s.updateSettings)
	const bookCount = useLibrary((s) => s.books.length)
	const readingCount = useLibrary((s) => s.readings.length)
	const roadmapCount = useLibrary((s) => s.roadmaps.length)

	const [check, setCheck] = useState<{
		ok: boolean
		version?: string
		error?: string
	} | null>(null)
	const [checking, setChecking] = useState(false)
	const [notice, setNotice] = useState("")

	const flash = (text: string) => {
		setNotice(text)
		setTimeout(() => setNotice(""), 2500)
	}

	const runCheck = async () => {
		setChecking(true)
		setCheck(null)
		try {
			setCheck(await window.api.aiCheck(settings.claudePath || "claude"))
		} finally {
			setChecking(false)
		}
	}

	const exportLibrary = async () => {
		try {
			if (await window.api.exportLibrary()) flash("Збережено")
		} catch {
			flash("Не вдалося зберегти")
		}
	}

	const importLibrary = async () => {
		const lib = await window.api.importLibrary()
		if (lib) {
			useLibrary.getState().replace(lib)
			flash("Імпортовано")
		}
	}

	return (
		<div className="max-w-2xl">
			<PageHeader
				title="Налаштування"
				subtitle="Вигляд, ціль на рік і дані бібліотеки"
			/>

			<motion.div
				className="space-y-6"
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25 }}
			>
				<Card
					icon={<Palette size={16} />}
					title="Вигляд"
					hint="Тема застосунку"
				>
					<div className="grid grid-cols-2 gap-3">
						{themes.map(({ id, label, icon: Icon, swatches }) => (
							<button
								type="button"
								key={id}
								onClick={() => updateSettings({ theme: id })}
								className={cx(
									"text-left rounded-xl border p-4 transition",
									settings.theme === id
										? "border-accent ring-2 ring-accent/20 bg-panel-2"
										: "border-line hover:border-ink-3 bg-panel-2/40",
								)}
							>
								<div className="flex items-center gap-2 mb-3">
									<Icon
										size={15}
										className={
											settings.theme === id ? "text-accent" : "text-ink-3"
										}
									/>
									<span className="text-sm font-medium">{label}</span>
								</div>
								<div className="flex gap-1.5">
									{swatches.map((c) => (
										<span
											key={c}
											className="w-7 h-7 rounded-md border border-black/10"
											style={{ background: c }}
										/>
									))}
								</div>
							</button>
						))}
					</div>
				</Card>

				<Card
					icon={<Target size={16} />}
					title="Читання"
					hint="Скільки книг плануєш прочитати за рік"
				>
					<div className="max-w-40">
						<Field label="Ціль на рік">
							<Input
								type="number"
								min={1}
								value={settings.yearlyGoal}
								onChange={(e) =>
									updateSettings({
										yearlyGoal: Math.max(1, Number(e.target.value) || 1),
									})
								}
							/>
						</Field>
					</div>
				</Card>

				<Card
					icon={<Terminal size={16} />}
					title="Claude Code"
					hint="Застосунок запускає встановлений на цьому комп'ютері claude CLI. Він має бути доступний у PATH — або вкажи повний шлях до файлу."
				>
					<div className="flex items-end gap-2">
						<div className="flex-1">
							<Field label="Шлях до claude">
								<Input
									value={settings.claudePath}
									placeholder="claude"
									onChange={(e) => {
										setCheck(null)
										updateSettings({ claudePath: e.target.value })
									}}
								/>
							</Field>
						</div>
						<Button
							onClick={runCheck}
							disabled={checking}
							icon={
								checking ? (
									<Loader2 size={15} className="animate-spin" />
								) : undefined
							}
						>
							Перевірити
						</Button>
					</div>
					{check && (
						<div
							className={cx(
								"flex items-center gap-2 mt-3 text-sm",
								check.ok ? "text-ok" : "text-danger",
							)}
						>
							{check.ok ? (
								<CheckCircle2 size={15} />
							) : (
								<AlertCircle size={15} />
							)}
							<span>
								{check.ok
									? `Працює${check.version ? ` · ${check.version}` : ""}`
									: check.error || "Не вдалося запустити claude"}
							</span>
						</div>
					)}
				</Card>

				<Card
					icon={<Database size={16} />}
					title="Дані"
					hint={`Книг: ${bookCount} · Записів читання: ${readingCount} · Роудмап: ${roadmapCount}`}
				>
					<div className="flex items-center gap-2">
						<Button icon={<Download size={15} />} onClick={exportLibrary}>
							Експортувати резервну копію
						</Button>
						<Button icon={<Upload size={15} />} onClick={importLibrary}>
							Імпортувати з файлу
						</Button>
						{notice && (
							<motion.span
								initial={{ opacity: 0, x: -6 }}
								animate={{ opacity: 1, x: 0 }}
								className="text-sm text-ok"
							>
								{notice}
							</motion.span>
						)}
					</div>
					<p className="text-xs text-ink-3 mt-3">
						Імпорт повністю замінює поточну бібліотеку.
					</p>
				</Card>

				<Card icon={<Info size={16} />} title="Про застосунок">
					<p className="text-sm text-ink-2">
						Bookshelf · версія {APP_VERSION}
						<br />
						<span className="text-ink-3">
							Особиста читальня. Дані зберігаються локально на цьому комп'ютері.
						</span>
					</p>
				</Card>
			</motion.div>
		</div>
	)
}
