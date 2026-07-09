# Dark mode

## Summary

Hubble Desktop follows the operating system's appearance. When macOS (or the
host OS) is in dark mode, the app, the editor, and embedded HTML apps switch to
a dark color scheme; when it returns to light, they switch back. There is no
in-app theme control in this slice — the OS is the single source of truth.

## Problem

The desktop app is hard-locked to light (`nativeTheme.themeSource = "light"` in
`apps/desktop/electron/main.ts`). A `.dark` token palette and a class-based dark
variant already exist in `apps/desktop/src/index.css`, but nothing ever applies
the `.dark` class, so the dark palette is dead code. Users who run their OS in
dark mode get a bright window regardless. (GitHub #110.)

## Goals

- The desktop app respects the OS appearance on launch and reacts when the OS
  appearance changes while the app is open.
- The editor surface — prose, sidebar, chrome, and code-block syntax
  highlighting — is legible and on-brand in dark mode.
- Embedded HTML apps render against a dark palette when the app is dark.
- Light mode is visually unchanged from today.
- The dark palette is warm and brand-consistent, guided by Notion's dark
  palette, not a generic neutral gray.

## Non-goals

- No in-app theme switcher (System / Light / Dark menu or setting). A manual
  override can be a follow-up; this slice is system-follow only.
- No persisted theme preference (nothing to persist without an override).
- No change to the `www` marketing/web app. It is WIP and consumes the shared
  theme separately; bringing it to dark is tracked with the shared-token
  unification (#56) and is out of scope here.
- No redesign of the light palette.

## Behavior

1. On launch, the desktop app detects the OS appearance and renders dark when
   the OS is dark, light otherwise.
2. When the OS appearance changes while the app is open, the app switches to
   match without a relaunch.
3. The window chrome, traffic-light region, and native menus follow the OS
   appearance (handled by Electron once the light lock is removed).
4. In dark mode, editor prose, headings, links, inline code, task lists,
   blockquotes, and the sidebar use the dark token palette.
5. Code-block syntax highlighting uses a dark theme that stays legible on the
   dark code surface (the current highlight colors are tuned for light only).
6. Embedded HTML apps render against the dark palette when the app is dark, and
   declare `color-scheme: light dark` so their native form controls and scrollbars
   match.
7. Light mode renders identically to the current release.

## UX validation

Run the desktop app (`pnpm dev:desktop`) with the OS in dark mode:

1. Confirm the window, sidebar, and editor open dark, with legible text and
   on-brand accents.
2. Open a note containing a fenced code block; confirm syntax colors are
   readable on the dark surface.
3. Open a note with an embedded HTML app; confirm it renders dark, not a bright
   panel inside a dark window.
4. Switch the OS to light while the app is open; confirm the app follows within
   a moment, with no relaunch and no stuck half-dark state.
5. Switch back to dark; confirm the same.
6. With the OS in light mode, confirm the app is visually identical to today.
