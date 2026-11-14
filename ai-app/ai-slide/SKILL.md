---
name: ai-slide
description: "Trình chiếu giống MS PowerPoint, có AI tạo slide — mở/lưu pptx, ppt, potx, ppsx, odp, xuất PDF/PNG. Use when the user opens the AI Slide app or asks about it."
---

# AI Slide

An AI App (`app.json`): the page is `assets/app.html`, the backend is `backend/` and runs
with no model turn. The user opens it from **AI Apps**; you are its assistant.

## Page tools (how you read and change the open deck)

The deck lives in the window, not in the backend. The window offers page tools; call them with
`app` → `{"action":"page","id":"app-<this skill>","tool":"…","args":{…}}` (no `tool` = the list):
`deck`, `slide {slide}`, `add_slides {slides, after?}`, `set_text {slide, element, lines}`,
`set_notes`, `remove_slide`, `move_slide`, `show_slide`. Read before you answer or change
anything, and read again after a change — the person edits between turns. The "Yêu cầu" tab of the
✨ AI panel is the same thing: one turn of this chat (`aicw.ask`).



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

Running the app needs none of the build tools: the engine ships compiled. Only before a Rust repair
(or for a LibreOffice conversion the person asked for) install them once, in the background:
`npm run -s setup-tools` (Rust + the wasm target, LibreOffice; can take a long while).

## Commands (`app` `call`, id `app-ai-slide`)

- `openFile` {fileId,name} → deck · `fromOutline` {text,title} → deck (dòng không thụt = tiêu đề slide, `-` = gạch đầu dòng) · `save` {format: pptx|ppt|potx|ppsx|odp|pdf|txt|json…, deck} → link tải · `capabilities` (định dạng máy này làm được) · `recent` · `saveDraft`/`loadDraft` · `renderBackdrop` · `fontList`/`fontFaces`. `reportEngineBug` là của trang.
