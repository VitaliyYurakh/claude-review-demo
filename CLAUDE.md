# CLAUDE.md

## What this app is

- One user: do not add accounts, login, or user switching.

## Commands

- `npx tsc --noEmit` — type check

The project has no tests and no linter, so the type check is the only automated check.

## How it works

Electron app, three parts sharing types from `src/shared/types.ts`.

There is no database: all user data is stored in a single JSON file, `userData/library.json`. It holds books, readings (status, progress, dates, rating, quotes, AI notes), roadmaps with stages, notes and settings.

The AI assistant runs the locally installed `claude` CLI (`claude -p`), not the API.

## Don't lose user data

- Existing `library.json` files must keep loading after any change to the data model.
- On load the file is merged over `emptyLibrary()` only at the top level, so a new nested field (for example in `Settings`) needs its own default.

## Conventions

- A new call between UI and main touches three places: the `BookshelfApi` interface, the preload, and the handler in main.
- UI text in Ukrainian.
