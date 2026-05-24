import { store } from "@simplestack/store";

export type FileEntry = {
	path: string;
	contentHash: string;
	updatedAt: number;
	deleted: boolean;
};

type ViewerStatus = "idle" | "loading" | "ready" | "error";

export type ExternalChange =
	| { kind: "none" }
	| { kind: "conflict"; remoteContent: string; remoteHash: string }
	| { kind: "deleted" };

const NO_CONFLICT: ExternalChange = { kind: "none" };

export type ViewerState = {
	currentPath: string | null;
	pendingPath: string | null;
	content: string;
	savedContent: string;
	basedOnHash: string | null;
	externalChange: ExternalChange;
	status: ViewerStatus;
	error: string | null;
};

export type WorkspaceState = {
	files: FileEntry[];
};

export type AppState = {
	workspace: WorkspaceState;
	viewer: ViewerState;
};

const initialState: AppState = {
	workspace: { files: [] },
	viewer: {
		currentPath: null,
		pendingPath: null,
		content: "",
		savedContent: "",
		basedOnHash: null,
		externalChange: NO_CONFLICT,
		status: "idle",
		error: null,
	},
};

export const appStore = store<AppState>(initialState);
export const workspaceStore = appStore.select("workspace");
export const viewerStore = appStore.select("viewer");
export const filesStore = workspaceStore.select("files");
export const currentPathStore = viewerStore.select("currentPath");
export const pendingPathStore = viewerStore.select("pendingPath");

export function resetState(): void {
	appStore.set(initialState);
}
