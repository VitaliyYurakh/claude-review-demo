# Troubleshooting

## The app is already open

electron-driver cannot attach to a running process: it only controls the app it started with `start_app`. A second copy may not open while the user's copy runs. Ask the user to close their window, then launch again.

## `npm run start` does not exist

The project has `dev`, `build`, `preview`. For a visual check build with `npm run build` and launch `out/main/index.js`; the dev server is not needed.

## A tool call is rejected

`scroll`, `hover` and other interacting tools except `snapshot` and `click` are not in the allow list of `.claude/settings.local.json`, so they need approval or are rejected in modes without prompts. Tell the user which tool was rejected and stop. Do not switch to `eval_*` or other tools instead.

## The driver disconnected

If electron-driver tools disappear mid-run (it crashed on a wrong `main` or `executablePath` before), tell the user: the server must be restarted through `/mcp`. An Electron process may stay in the background - say so, do not kill processes yourself.

## Blank or white window

Usually the build is stale or failed. Rebuild with `npm run build`, check `console_logs`, then take the screenshot again.
