import { useStoreValue } from "@simplestack/store/react";
import { loadPath } from "../store/actions";
import { currentPathStore, filesStore, pendingPathStore } from "../store/state";

export function Sidebar() {
	const files = useStoreValue(filesStore);
	const currentPath = useStoreValue(currentPathStore);
	const pendingPath = useStoreValue(pendingPathStore);
	const highlightPath = pendingPath ?? currentPath;

	const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

	return (
		<aside className="flex w-[220px] shrink-0 flex-col overflow-hidden border-e border-sidebar-border bg-sidebar">
			<div className="flex items-center border-b border-sidebar-border px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				Files
			</div>
			<div className="flex-1 overflow-y-auto overscroll-contain py-1">
				{sorted.length === 0 && (
					<p className="px-2.5 py-2 text-xs text-muted-foreground">
						No files yet. Use the + button to create one.
					</p>
				)}
				{sorted.map((f) => {
					const isActive = f.path === highlightPath;
					return (
						<button
							key={f.path}
							type="button"
							onClick={() => void loadPath(f.path)}
							title={f.path}
							className={`block w-full truncate border-none bg-transparent px-2.5 py-1 text-start text-[13px] text-sidebar-foreground hover:bg-sidebar-accent ${
								isActive
									? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
									: ""
							}`}
						>
							{f.path}
						</button>
					);
				})}
			</div>
		</aside>
	);
}
