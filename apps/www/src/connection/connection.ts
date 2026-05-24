const URL_KEY = "hubble.connection.url";
const WORKSPACE_ID_KEY = "hubble.connection.workspaceId";
const WORKSPACE_NAME_KEY = "hubble.connection.workspaceName";

export type StoredConnection = {
	url: string;
	workspaceId: string | null;
	workspaceName: string | null;
};

export function readConnection(): StoredConnection | null {
	const url = localStorage.getItem(URL_KEY);
	if (!url) return null;
	return {
		url,
		workspaceId: localStorage.getItem(WORKSPACE_ID_KEY),
		workspaceName: localStorage.getItem(WORKSPACE_NAME_KEY),
	};
}

export function saveConnectionUrl(url: string): void {
	localStorage.setItem(URL_KEY, url);
}

export function saveWorkspace(id: string, name: string): void {
	localStorage.setItem(WORKSPACE_ID_KEY, id);
	localStorage.setItem(WORKSPACE_NAME_KEY, name);
}

export function clearWorkspace(): void {
	localStorage.removeItem(WORKSPACE_ID_KEY);
	localStorage.removeItem(WORKSPACE_NAME_KEY);
}

export function disconnect(): void {
	localStorage.removeItem(URL_KEY);
	clearWorkspace();
}
