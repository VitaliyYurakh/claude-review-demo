---

name: release-version
description: Release a new version of Bookshelf - bump the version and build the portable Windows exe
argument-hint: "[patch|minor|major|<version>]"
arguments: [version]
disable-model-invocation: true
allowed-tools: Bash(git status *), Bash(npx tsc --noEmit), Bash(npm version *), Bash(npm run dist)
---

Release Bookshelf as version `$version`. Run every command from `${CLAUDE_PROJECT_DIR}`.

1. **Argument.** `$version` must be `patch`, `minor`, `major` or a version like `1.2.0`. If it is empty or anything else, stop and ask for it.
2. **Clean tree.** `git status --short -- .` (only the app folder). If there are uncommitted changes, list them and stop: a release is built only from committed code.
3. **Type check.** `npx tsc --noEmit`. On errors, stop and show them.
4. **Version.** `npm version $version --no-git-tag-version`. It changes only `package.json` and `package-lock.json`, without a commit or a tag.
5. **Build.** `npm run dist`. On failure, show the error and say that the version is already bumped in `package.json`.
6. **Report:** the old and new version, the path and size of the `.exe` in `release/`, and the files that changed. Do not commit or push: the user does that.
