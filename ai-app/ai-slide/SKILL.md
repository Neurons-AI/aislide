---
name: ai-slide
description: "Trình chiếu giống MS PowerPoint, có AI tạo slide — mở/lưu pptx, ppt, potx, ppsx, odp, xuất PDF/PNG. Use when the user opens the AI Slide app or asks about it."
---

# AI Slide

An AI App (`app.json`): the page is `assets/app.html`, the backend is `backend/` and runs
with no model turn. The user opens it from **AI Apps**; you are its assistant.

## Working with the app

- Run its backend with the `app` tool instead of redoing its work by hand:
  `{"action":"list"}` shows the commands it offers you; `{"action":"call","id":"app-ai-slide","name":"<command>","args":{…}}` runs one.
- Change what the page shows with the `artifact` tool on id `app-ai-slide`
  (`data` to push values, `update` to change the page). Never open a second window.

## When a message arrives from the page

A user message starting with `[artifact-reply: AI Slide]` was sent by the page
(`aicw.send`). Handle it as a request about this app.

## The engine is Rust (DeckCraft) — and it is repairable

Opening/saving PowerPoint files, rendering slides and PDF run in **DeckCraft**, a Rust engine
compiled to WebAssembly (`backend/engine/deckcraft.wasm`). Its full source is in `engine-src/`.
When a bug points into `engine-src/…/*.rs` (a Rust panic or compile error), fix the **Rust
source**, never the `.wasm`: the app rebuilds the engine from source by itself. Read
`ENGINE-REPAIR.md` first, check your copy with `node scripts/engine-check.mjs`.
