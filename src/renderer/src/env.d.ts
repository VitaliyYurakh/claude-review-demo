/// <reference types="vite/client" />
import type { BookshelfApi } from "@shared/types"

declare global {
	interface Window {
		api: BookshelfApi
	}
}
