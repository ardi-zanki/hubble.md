import { createConvexBackend } from "@hubble.md/convex-client";
import type { SyncBackend } from "@hubble.md/sync";
import { categorizeError, describeError } from "../connection/convex-error";
import { getDeviceId } from "../connection/deviceId";
import { latest } from "../lib/latest";
import {
	type FileEntry,
	resetState,
	type ViewerState,
	viewerStore,
	workspaceStore,
} from "./state";

type Ctx = {
	backend: SyncBackend;
	workspaceId: string;
	deviceId: string;
};

let ctx: Ctx | null = null;

export function initActions(url: string, workspaceId: string): void {
	const deviceId = getDeviceId();
	if (!deviceId) {
		throw new Error("deviceId missing — cannot initialize actions");
	}
	ctx = {
		backend: createConvexBackend(url),
		workspaceId,
		deviceId,
	};
}

export function teardownActions(): void {
	ctx = null;
	resetState();
}

function requireCtx(): Ctx {
	if (!ctx) throw new Error("actions not initialized");
	return ctx;
}

export function getActionCtx(): Ctx | null {
	return ctx;
}

async function computeContentHash(content: string): Promise<string> {
	const data = new TextEncoder().encode(content);
	const hash = await crypto.subtle.digest("SHA-256", data);
	const bytes = new Uint8Array(hash);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Classify a remote update against the editor's current state.
 * Mirrors apps/desktop/src/externalFileChange.ts.
 */
type ChangeKind = "none" | "match" | "reload" | "conflict";

function classifyRemoteChange(args: {
	editorContent: string;
	savedContent: string;
	basedOnHash: string | null;
	remoteContent: string;
	remoteHash: string;
}): ChangeKind {
	const {
		editorContent,
		savedContent,
		basedOnHash,
		remoteContent,
		remoteHash,
	} = args;
	if (basedOnHash === remoteHash) return "none";
	if (editorContent === remoteContent) return "match";
	if (editorContent === savedContent) return "reload";
	return "conflict";
}

/**
 * Atomically advance baseline state (content, savedContent, basedOnHash) and
 * clear any pending external-change banner. Use whenever we accept a new
 * authoritative version of the file.
 */
function cleanState(
	state: ViewerState,
	content: string,
	hash: string,
): ViewerState {
	return {
		...state,
		content,
		savedContent: content,
		basedOnHash: hash,
		externalChange: { kind: "none" },
		status: "ready",
		error: null,
	};
}

export async function refreshFiles(): Promise<void> {
	const { backend, workspaceId } = requireCtx();
	try {
		const remote = await backend.getFiles(workspaceId);
		const visible: FileEntry[] = remote
			.filter((f) => !f.deleted)
			.map((f) => ({
				path: f.path,
				contentHash: f.contentHash,
				updatedAt: f.updatedAt,
				deleted: f.deleted,
			}));
		workspaceStore.set({ files: visible });
	} catch (err) {
		console.error("refreshFiles failed:", describeError(categorizeError(err)));
	}
}

const LOADING_DELAY_MS = 150;

export const loadPath = latest(
	async ({ isStale }, path: string): Promise<void> => {
		const { backend, workspaceId } = requireCtx();
		// Snap the sidebar selection to the clicked file immediately, but keep
		// the editor pinned to the previous file's content until the new one
		// arrives. The loading status only flips after LOADING_DELAY_MS, so
		// fast loads never show a flash.
		viewerStore.set((s) => ({ ...s, pendingPath: path, error: null }));
		const timer = window.setTimeout(() => {
			if (isStale()) return;
			viewerStore.set((s) => ({ ...s, status: "loading", error: null }));
		}, LOADING_DELAY_MS);
		try {
			const remote = await backend.getFiles(workspaceId);
			if (isStale()) return;
			const file = remote.find((f) => f.path === path);
			if (!file || file.deleted) {
				viewerStore.set((s) => ({
					...s,
					currentPath: path,
					pendingPath: null,
					content: "",
					savedContent: "",
					basedOnHash: null,
					externalChange: { kind: "none" },
					status: "error",
					error: `File not found: ${path}`,
				}));
				return;
			}
			viewerStore.set((s) => ({
				...cleanState(s, file.content, file.contentHash),
				currentPath: path,
				pendingPath: null,
			}));
		} catch (err) {
			if (isStale()) return;
			viewerStore.set((s) => ({
				...s,
				pendingPath: null,
				status: "error",
				error: describeError(categorizeError(err)),
			}));
		} finally {
			window.clearTimeout(timer);
		}
	},
);

export function updateEditorContent(path: string, content: string): void {
	const state = viewerStore.get();
	if (state.currentPath !== path) return;
	// Type-along resolution: if the user manually edits to match the pending
	// remote, the conflict is gone — clear it and advance baseline.
	if (
		state.externalChange.kind === "conflict" &&
		content === state.externalChange.remoteContent
	) {
		viewerStore.set(
			cleanState(state, content, state.externalChange.remoteHash),
		);
		return;
	}
	viewerStore.set({ ...state, content });
}

export async function savePathContent(
	path: string,
	content: string,
): Promise<void> {
	const { backend, workspaceId, deviceId } = requireCtx();
	const state = viewerStore.get();
	if (
		state.currentPath === path &&
		(state.externalChange.kind === "conflict" ||
			state.externalChange.kind === "deleted")
	) {
		return;
	}
	// Skip no-op saves only when we're still on the same file and content
	// hasn't changed since the last successful save.
	if (state.currentPath === path && content === state.savedContent) return;
	try {
		if (state.currentPath === path && state.basedOnHash !== null) {
			const remote = await backend.getFiles(workspaceId);
			const latestState = viewerStore.get();
			if (
				latestState.currentPath === path &&
				(latestState.externalChange.kind === "conflict" ||
					latestState.externalChange.kind === "deleted")
			) {
				return;
			}
			const remoteFile = remote.find((f) => f.path === path);
			if (!remoteFile || remoteFile.deleted) {
				markRemoteDeleted(path);
				return;
			}
			if (remoteFile.contentHash !== latestState.basedOnHash) {
				applyRemoteChange(path, remoteFile.content, remoteFile.contentHash);
				return;
			}
		}
		const hash = await computeContentHash(content);
		await backend.pushFile({
			workspaceId,
			path,
			contentHash: hash,
			content,
			deviceId,
		});
		viewerStore.set((s) => {
			if (s.currentPath !== path) return s;
			if (
				s.externalChange.kind === "conflict" ||
				s.externalChange.kind === "deleted"
			) {
				return s;
			}
			// If the editor hasn't been further edited during the push, run
			// cleanState (advances baseline AND clears any stale conflict from
			// before this save). If the user typed more, only advance baseline
			// metadata — don't touch the live editor content.
			if (s.content === content) {
				return cleanState(s, content, hash);
			}
			return {
				...s,
				savedContent: content,
				basedOnHash: hash,
			};
		});
	} catch (err) {
		console.error(
			"savePathContent failed:",
			describeError(categorizeError(err)),
		);
	}
}

export function markRemoteDeleted(path: string): void {
	const state = viewerStore.get();
	if (state.currentPath !== path) return;
	viewerStore.set({
		...state,
		externalChange: { kind: "deleted" },
		status: "error",
		error: "File deleted remotely",
	});
}

/**
 * Apply a remote update for the currently-open file. Classifies the change and
 * dispatches into a single branch that updates all relevant fields atomically.
 */
export function applyRemoteChange(
	path: string,
	remoteContent: string,
	remoteHash: string,
): void {
	const state = viewerStore.get();
	if (state.currentPath !== path) return;
	const kind = classifyRemoteChange({
		editorContent: state.content,
		savedContent: state.savedContent,
		basedOnHash: state.basedOnHash,
		remoteContent,
		remoteHash,
	});
	switch (kind) {
		case "none":
			// No actual change relative to our baseline. Only thing to do is
			// clear a stale conflict banner if one is lingering.
			if (state.externalChange.kind !== "none") {
				viewerStore.set({ ...state, externalChange: { kind: "none" } });
			}
			return;
		case "match":
			// Editor already matches remote (type-along resolution, or our own
			// push echoing back with the new hash). Advance baseline + clear.
			viewerStore.set({
				...state,
				savedContent: remoteContent,
				basedOnHash: remoteHash,
				externalChange: { kind: "none" },
			});
			return;
		case "reload":
			// Editor was clean. Adopt the remote silently.
			viewerStore.set(cleanState(state, remoteContent, remoteHash));
			return;
		case "conflict":
			// Editor is dirty and remote diverges. Surface the banner.
			viewerStore.set({
				...state,
				externalChange: { kind: "conflict", remoteContent, remoteHash },
			});
			return;
	}
}

export function reloadFromRemote(): void {
	const state = viewerStore.get();
	if (state.externalChange.kind !== "conflict") return;
	const { remoteContent, remoteHash } = state.externalChange;
	viewerStore.set(cleanState(state, remoteContent, remoteHash));
}

export function dismissExternalChange(): void {
	const state = viewerStore.get();
	if (state.externalChange.kind !== "conflict") return;
	viewerStore.set({ ...state, externalChange: { kind: "none" } });
}
