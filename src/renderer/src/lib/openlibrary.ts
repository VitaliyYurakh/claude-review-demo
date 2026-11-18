export interface OlHit {
	title: string
	author: string
	pages?: number
	cover?: string
	year?: number
}

interface OlDoc {
	title: string
	author_name?: string[]
	number_of_pages_median?: number
	first_publish_year?: number
	cover_i?: number
}

export async function searchOpenLibrary(q: string): Promise<OlHit[]> {
	const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=title,author_name,number_of_pages_median,cover_i,first_publish_year`
	const res = await fetch(url)
	if (!res.ok) return []
	const data: { docs?: OlDoc[] } = await res.json()
	return (data.docs ?? []).map((d) => ({
		title: d.title,
		author: d.author_name?.[0] ?? "",
		pages: d.number_of_pages_median,
		year: d.first_publish_year,
		cover: d.cover_i
			? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
			: undefined,
	}))
}
