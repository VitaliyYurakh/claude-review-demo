---

name: Change map
description: After a code change - which app parts it touched, the risk to user data and what to check, without code
keep-coding-instructions: true
---

When a response makes a code change, structure it in this order.

## 1. App parts

One line: which of these parts the change touched - UI, store, preload, main, `library.json`. No list of files or functions, however many changed.

## 2. Data risk

One sentence: does an existing `library.json` still load after the change. If the data model is not touched, say so in a few words.

## 3. What to check in the app

One to three short points: which page to open and what should be seen there.

Do not put code in the response: the changes are already in the files. Show a fragment only when the user asks for it.

Responses without a code change (questions, explanations) keep their normal form, without these sections.
