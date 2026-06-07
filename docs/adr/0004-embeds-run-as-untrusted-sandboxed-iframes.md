# Embeds run as untrusted, sandboxed iframes

> **Status: superseded by [ADR-0005](./0005-embeds-render-in-realm-shadow-dom.md).** Per-embed iframing was rejected for fatal editor-UX reasons — overflow clipping (dropdowns/popovers can't escape the frame) and nested-iframe composition. The trust boundary moved to the *document* level (sandbox the whole editor for untrusted docs), with embeds rendering in-realm. The async broker decision below survives unchanged. Reasoning retained for the record.

[[Embed]]s are arbitrary client-side apps authored in a Workspace, synced through Convex, and rendered on both desktop and web. Because a Workspace's files travel to other devices (and, eventually, other people), an Embed must be treated as **untrusted code that auto-executes when a Markdown File is opened**. We render each Embed in a **sandboxed iframe** (unique opaque origin, no `allow-same-origin`), so its code cannot reach the host realm — the Electron preload bridge, the app origin, the Convex client, or `localStorage`. All Workspace/filesystem access happens only through a host-controlled postMessage broker. This is identical on desktop and web.

## Considered Options

- **Direct same-realm mount** (trusted-author model). Rejected: foreign Embed code would run with full host privileges = RCE on the viewer's machine the moment they open a file. Safe only while Workspaces are single-user, which is not a durable assumption.
- **Web Component / Shadow DOM.** Rejected as the isolation layer: Shadow DOM isolates DOM/CSS but **not JS** — code still runs in the main realm. (Still usable as the host-side wrapper element around the iframe.)
- **In-realm JS hardening (SES/Compartments).** Rejected: heavy, experimental, requires hand-built membranes around every host capability, and fights bundled React.

## Consequences

- Iframes don't auto-size to content. Height is synced over the same postMessage channel via a `ResizeObserver` in the Embed; last-known height is cached on the ProseMirror node attr to avoid load jank.
- All Embed data access is **async** (brokered RPC), not direct calls — this fixes the query-hook API shape before any Embed is written, and mirrors the existing `SyncBackend` boundary.
- One iframe per Embed carries real memory cost; mount only Embeds in/near the viewport.
- This boundary covers **runtime** trust only. Build-time supply chain (malicious `postinstall` from an Embed's declared npm deps) runs on the builder's machine and needs a separate mitigation.
