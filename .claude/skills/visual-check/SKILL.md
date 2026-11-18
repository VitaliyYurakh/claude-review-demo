---

name: visual-check
description: "Visually check the Bookshelf app in a real window - build it, launch it through electron-driver, look at the screen and report what is shown. Use at the end of every task in which you changed how the app looks: a `.tsx` file in `src/renderer`, `index.css`, a theme variable or on-screen text. A passing type check does not replace this check. Also use when the user asks to open or run the app and look at it, check how a page or element looks, take a screenshot of the app, or verify a UI change in the running app (e.g. «відкрий застосунок і подивись», «перевір як виглядає», «зроби знімок сторінки статистики», «подивись, чи нормально відображається»). Do not use for changes that are not visible on screen (main, preload, data, types), for a type check or a build alone, for questions about UI code that need no running app, or for other Electron apps."
---

# Visual check of Bookshelf

## Build output

!`cd "${CLAUDE_PROJECT_DIR}" && npm run build || true`

## Steps

1. **Check the build.** The app was built when this skill loaded, the output is above. If it shows an error, stop and report it: there is nothing to look at.
2. **Launch.** `start_app` with `main: "${CLAUDE_PROJECT_DIR}/out/main/index.js"` and `cwd: "${CLAUDE_PROJECT_DIR}"`.
3. **Find elements.** `snapshot` gives numbered refs. Use refs for `click`, never guess selectors.
4. **Go to the page** the user asked about through the sidebar, then `snapshot` again.
5. **Look.** `screenshot` with a short name (`stats-after-change`), then open the PNG with Read. Screenshots land in `${CLAUDE_PROJECT_DIR}/.electron-driver/screenshots/` (ignored by git).
6. **Report** what is on the screen and compare it with what the user expected: layout, text, numbers, theme. Say plainly what does not match.
7. **Stop.** `stop_app` always, also after an error.

## Rules

- The app writes the real `library.json`. Do not click anything that changes data (add, delete, save, import, status change) unless the user asked for it.
- Navigation and reading only: sidebar, tabs, scrolling. `eval_main`, `eval_renderer`, `drop_file` are denied - do not look for a way around.
- One screenshot per thing to check. Use `snapshot` or `get_text` for text; screenshots are for how it looks.

If something fails, see [troubleshooting.md](troubleshooting.md).
