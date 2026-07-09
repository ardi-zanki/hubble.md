# Dark mode — technical notes

## Theme detection (the mechanism)

Remove the light lock in `apps/desktop/electron/main.ts`:

```diff
- nativeTheme.themeSource = "light";
+ nativeTheme.themeSource = "system";
```

`"system"` makes Electron mirror the OS appearance onto the renderer's
`prefers-color-scheme`, and it lets the native chrome/menus follow the OS for
free.

The renderer's dark variant is **class-based**
(`@custom-variant dark (&:is(.dark *))` in `apps/desktop/src/index.css`), so a
CSS `@media (prefers-color-scheme: dark)` block would not activate it. A small
renderer module watches the media query and toggles `.dark` on
`<html>`:

```ts
// apps/desktop/src/theme.ts
export function initSystemTheme(): void {
	const query = window.matchMedia("(prefers-color-scheme: dark)");
	const apply = (isDark: boolean) =>
		document.documentElement.classList.toggle("dark", isDark);
	apply(query.matches);
	query.addEventListener("change", (e) => apply(e.matches));
}
```

Called once from `src/main.tsx` before `createRoot`. This is the full mechanism
for the main app surface, and it is the part proven by the reference branch
(see below).

**Light-lock decision:** the lock is removed, not kept behind a flag. Keeping a
light override would defeat the feature; `"system"` is the desired default and
is reversible if a manual override is added later.

**Flash-on-launch:** `main.tsx` runs after first paint, so cold-launching into
dark would show a one-frame light flash. A tiny inline `<head>` script in
`index.html` sets the class from `matchMedia` before paint (the standard FOUC
fix); `src/theme.ts` then attaches the live listener. The app ships no Content
Security Policy, so the inline script is unblocked; if a CSP is added later it
needs a hash/nonce for this script.

## Surfaces in scope

Dark mode touches three theme sources. They are independent and can land
incrementally.

1. **Desktop React app** — `apps/desktop/src/index.css` already defines the
   `.dark` token block and the dark variant. Only the detection wiring above is
   needed. **(Proven in the reference branch.)**

2. **Code-block syntax highlighting** — `packages/ui/src/editor/EditorView.css`
   hardcodes Xcode-light hex for `.hljs-*` tokens (lines ~331–401). Add a
   `.dark`-scoped override block with a dark palette (the reference branch uses
   Atom One Dark). Lower-churn than tokenizing every rule; can be promoted to
   `--syntax-*` custom properties later if desired.

3. **Embedded HTML apps** — `packages/runtime/html-app-theme.css` is a
   self-contained copy of the light palette with `color-scheme: light`, injected
   `?raw` into each HTML-app `<head>` via `htmlAppHeadStyles` in
   `apps/desktop/electron/main.ts`. HTML apps render in a sandboxed
   `<iframe sandbox="allow-scripts allow-forms">` (`src/editor/IframeView.tsx`).
   A sandboxed iframe still inherits the host renderer's resolved
   `prefers-color-scheme`, so a `@media (prefers-color-scheme: dark)` block in
   the injected theme is enough — **no host-to-iframe theme messaging needed**.
   The fix: set `color-scheme: light dark` on `:root` (so UA controls and
   scrollbars adapt) and add a `@media (prefers-color-scheme: dark)` block that
   swaps the palette tokens. Verified working in a sandboxed HTML app, light and
   dark. (Note: this surface is media-query driven; the main app is class
   driven. They agree under system-follow. A future manual override would need
   to also signal the iframe — e.g. emulate/propagate the scheme — to stay in
   sync.)

### Token duplication note

The light palette now lives in three places: `packages/ui/src/theme.css`
(shared), `apps/desktop/src/index.css` (desktop superset, holds the `.dark`
block), and `packages/runtime/html-app-theme.css` (HTML-app runtime). #56 closed
the desktop↔shared duplication conceptually; dark mode re-raises it because the
`.dark` block currently lives only in the desktop file. Decide whether the dark
tokens should move into the shared `theme.css` so the runtime and any future
`www` work inherit them, or stay per-surface for this slice. The minimal slice
keeps them per-surface to limit blast radius.

## Dark palette (the open design decision)

The existing `.dark` tokens are explicitly placeholder ("Dark keeps neutral
state colors for now (light mode is the brand focus)") and sit at hue 106
(yellow-green). The light palette is warm at hue ~95. To match #110's
"warmer, Notion-guided" ask, align the dark neutrals to the warm family and let
the brand green carry the accent:

| Token | Current placeholder | Proposed (warm, Notion-guided) |
|-------|--------------------|--------------------------------|
| `--background` | `oklch(0.236 0.006 106)` | `oklch(0.205 0.004 95)` — near-Notion `#191919`, warm |
| `--card` / `--popover` | `oklch(0.274 0.006 106)` | `oklch(0.245 0.005 95)` |
| `--sidebar` | `= card` | `var(--card)` |
| `--foreground` | `oklch(0.962 0.003 106)` | `oklch(0.945 0.003 95)` (warm off-white) |
| `--muted-foreground` | `oklch(0.754 0.005 106)` | `oklch(0.72 0.006 95)` |
| `--primary` | `brand 88% + white` | keep (lifted forest reads well on dark) |
| `--selected` | neutral gray | warm amber tint to echo the light "selected" yellow |

These values are applied in the reference branch (desktop `.dark` block and the
HTML-app runtime dark block) and verified in screenshots. They are still open to
a designer's eye on final tuning — listed so the palette decision is explicit
rather than implicit.

## Testing

- **Unit (proven):** `apps/desktop/src/theme.test.ts` — `initSystemTheme` adds
  `.dark` when the OS prefers dark, leaves it off for light, and reacts to a
  runtime appearance change. Runs under the per-file `// @vitest-environment
  happy-dom` directive (happy-dom is already available; no new dep/config).
- **Manual:** the UX-validation steps in PRODUCT.md, plus before/after
  screenshots in light and dark.
- **Regression:** existing desktop (`pnpm --filter @hubble.md/desktop test`) and
  editor (`pnpm --filter @hubble.md/editor test`) suites stay green;
  `pnpm build:desktop` (tsc + electron-vite) and Biome stay clean.

## Reference branch

A working branch implements all three surfaces plus the warm palette and the
anti-flash guard:

- detection wiring (`themeSource = "system"`, `src/theme.ts`, inline guard),
- dark code-block syntax theme,
- warm Notion-guided palette in the desktop `.dark` block,
- HTML-app runtime dark block,
- a `happy-dom` unit test for the toggle, and a `CHANGELOG` entry.

Verified: desktop suite (42) and editor suite (32) pass; `pnpm build:desktop`
(tsc + electron-vite) and Biome are clean; screenshots cover the editor and an
embedded HTML app in both light and dark, with light unchanged. The open item
left for review is final palette tuning, not mechanism.
