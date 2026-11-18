import type { Book, Reading } from "@shared/types"
import { useCallback, useEffect, useRef, useState } from "react"
import { uid } from "@/store/library"

export function bookContext(book: Book, reading?: Reading) {
	const lines = [`Книга: «${book.title}» — ${book.author}`]
	if (book.genre) lines.push(`Жанр: ${book.genre}`)
	if (book.pages) lines.push(`Сторінок: ${book.pages}`)
	if (book.description) lines.push(`Опис: ${book.description}`)
	if (reading?.rating) lines.push(`Моя оцінка: ${reading.rating}/5`)
	if (reading?.review) lines.push(`Мій відгук: ${reading.review}`)
	if (reading?.quotes.length)
		lines.push(`Мої цитати:\n${reading.quotes.map((q) => `- ${q}`).join("\n")}`)
	return lines.join("\n")
}

const systemPrefix =
	"Ти — начитаний книжковий співрозмовник. Відповідай українською, стисло і по суті, у форматі markdown. Не вигадуй фактів про книгу: якщо не знаєш — скажи.\n\n"

export const templates = {
	review: (ctx: string) =>
		`${systemPrefix}${ctx}\n\nНапиши рецензію на цю книгу: сильні та слабкі сторони, кому сподобається, підсумок у 2 реченнях.`,
	summary: (ctx: string) =>
		`${systemPrefix}${ctx}\n\nРозкажи, про що ця книга, без спойлерів. 5–8 речень.`,
	similar: (ctx: string) =>
		`${systemPrefix}${ctx}\n\nПорадь 5 схожих книг. Для кожної: назва, автор, одне речення чому схожа.`,
	worth: (ctx: string) =>
		`${systemPrefix}${ctx}\n\nЧи варто читати цю книгу? Дай чесну відповідь з аргументами, врахуй мої попередні оцінки, якщо вони є.`,
	custom: (ctx: string, q: string) => `${systemPrefix}${ctx}\n\nПитання: ${q}`,
}

export function useAi() {
	const [text, setText] = useState("")
	const [running, setRunning] = useState(false)
	const [error, setError] = useState<string | undefined>()
	const idRef = useRef<string | null>(null)
	const resolveRef = useRef<((s: string) => void) | null>(null)
	const textRef = useRef("")
	textRef.current = text

	useEffect(() => {
		const offChunk = window.api.onAiChunk((c) => {
			if (c.requestId === idRef.current) setText((t) => t + c.text)
		})
		const offDone = window.api.onAiDone((d) => {
			if (d.requestId !== idRef.current) return
			setRunning(false)
			if (!d.ok) setError(d.error)
			if (d.full && !d.ok) setText(d.full)
			resolveRef.current?.(d.full)
			idRef.current = null
		})
		return () => {
			offChunk()
			offDone()
			if (idRef.current) window.api.aiCancel(idRef.current)
		}
	}, [])

	const ask = useCallback((prompt: string, json = false) => {
		if (idRef.current) window.api.aiCancel(idRef.current)
		const requestId = uid()
		idRef.current = requestId
		setText("")
		setError(undefined)
		setRunning(true)
		window.api.aiAsk({ requestId, prompt, json })
		return new Promise<string>((resolve) => {
			resolveRef.current = resolve
		})
	}, [])

	const cancel = useCallback(() => {
		if (idRef.current) window.api.aiCancel(idRef.current)
		idRef.current = null
		resolveRef.current?.(textRef.current)
		resolveRef.current = null
		setRunning(false)
	}, [])

	return { text, running, error, ask, cancel, reset: () => setText("") }
}
