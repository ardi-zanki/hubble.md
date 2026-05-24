import { useStoreValue } from "@simplestack/store/react";
import { currentPathStore } from "../store/state";

function basename(path: string) {
	return path.split(/[\\/]/).pop() ?? path;
}

type Props = {
	workspaceName: string;
	onSwitcherOpen: () => void;
	onNewNote: () => void;
};

export function Toolbar({ workspaceName, onSwitcherOpen, onNewNote }: Props) {
	const currentPath = useStoreValue(currentPathStore);

	return (
		<div className="flex h-9 items-center border-b border-border bg-background">
			<div className="flex items-center gap-2 px-2.5">
				<button
					type="button"
					onClick={onSwitcherOpen}
					className="max-w-[180px] truncate rounded-sm px-2 py-1 text-xs font-medium hover:bg-sidebar-accent"
				>
					{workspaceName}
				</button>
			</div>
			<span className="flex-1 truncate text-center text-xs text-muted-foreground">
				{currentPath ? basename(currentPath) : " "}
			</span>
			<div className="flex items-center justify-end gap-1 px-2.5">
				<button
					type="button"
					onClick={onNewNote}
					title="New note"
					aria-label="New note"
					className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-base hover:bg-sidebar-accent"
				>
					+
				</button>
			</div>
		</div>
	);
}
