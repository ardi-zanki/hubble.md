import { Button, Sidebar as SharedSidebar, SidebarFrame } from "@hubble.md/ui";
import { useStoreValue } from "@simplestack/store/react";
import {
	createMarkdownFileInFolder,
	deleteFolder,
	deleteMarkdownFile,
	loadPath,
	openWorkspace,
	renameMarkdownFile,
	setSidebarOpen,
	setSortMode,
} from "../store/actions";
import {
	currentPathStore,
	sidebarOpenStore,
	workspaceStore,
} from "../store/state";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export function Sidebar() {
	const workspace = useStoreValue(workspaceStore);
	const sidebarOpen = useStoreValue(sidebarOpenStore);
	const currentPath = useStoreValue(currentPathStore);
	const { workspacePath, files, sortMode } = workspace;

	if (!sidebarOpen) return null;
	const collapseSidebar = () => setSidebarOpen(false);
	if (!workspacePath) {
		return (
			<SidebarFrame onCollapse={collapseSidebar}>
				<div className="flex h-full flex-col items-start justify-center gap-3 px-3 text-sm">
					<div>
						<p className="font-medium text-sidebar-foreground">
							No folder selected
						</p>
						<p className="text-sidebar-foreground/70">
							Add a folder to browse files.
						</p>
					</div>
					<Button size="sm" onClick={() => void openWorkspace()}>
						Open folder
					</Button>
				</div>
			</SidebarFrame>
		);
	}

	const relativePath = (absPath: string) => {
		const prefix = workspacePath.endsWith("/")
			? workspacePath
			: `${workspacePath}/`;
		return absPath.startsWith(prefix) ? absPath.slice(prefix.length) : absPath;
	};
	const absolutePath = (displayPath: string | null) => {
		if (!displayPath) return workspacePath;
		const normalized = displayPath.replace(/\/+$/, "");
		return workspacePath.endsWith("/")
			? `${workspacePath}${normalized}`
			: `${workspacePath}/${normalized}`;
	};

	return (
		<SharedSidebar
			files={files.map((file) => ({
				path: file.path,
				modifiedAt: file.modified_at,
			}))}
			currentPath={currentPath ?? null}
			sortMode={sortMode}
			storageScope={workspacePath}
			header={<WorkspaceSwitcher />}
			getDisplayPath={relativePath}
			onCollapse={collapseSidebar}
			onSortModeChange={setSortMode}
			onSelectFile={(path) => void loadPath(path)}
			onRenameFile={(path, nextName) => void renameMarkdownFile(path, nextName)}
			onDeleteFile={(path) => void deleteMarkdownFile(path)}
			onCreateFile={(folderId) =>
				createMarkdownFileInFolder(absolutePath(folderId))
			}
			onDeleteFolder={(folderId) => void deleteFolder(absolutePath(folderId))}
		/>
	);
}
