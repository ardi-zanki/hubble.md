import { api } from "@hubble.md/sync-backend";
import type { Doc } from "@hubble.md/sync-backend/types";
import { ConvexHttpClient } from "convex/browser";
import { useEffect, useId, useState } from "react";
import { categorizeError, describeError } from "../connection/convex-error";

type Props = {
	url: string;
	currentWorkspaceId: string;
	onSelect: (id: string, name: string) => void;
	onClose: () => void;
	onDisconnect: () => void;
};

export function WorkspaceSwitcher({
	url,
	currentWorkspaceId,
	onSelect,
	onClose,
	onDisconnect,
}: Props) {
	const [client] = useState(() => new ConvexHttpClient(url));
	const [workspaces, setWorkspaces] = useState<Doc<"workspaces">[] | null>(
		null,
	);
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const result = await client.query(api.sync.listWorkspaces, {});
				if (!cancelled) setWorkspaces(result);
			} catch (err) {
				if (!cancelled) setError(describeError(categorizeError(err)));
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [client]);

	const handleCreate = async (event: React.FormEvent) => {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		setBusy(true);
		setError(null);
		try {
			const id = await client.mutation(api.sync.createWorkspace, {
				name: trimmed,
			});
			onSelect(id, trimmed);
		} catch (err) {
			setError(describeError(categorizeError(err)));
			setBusy(false);
		}
	};

	const titleId = useId();

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
			<button
				type="button"
				aria-label="Close"
				className="absolute inset-0 cursor-default bg-black/30"
				onClick={onClose}
			/>
			<div
				className="relative w-full max-w-sm rounded-md border border-border bg-sidebar p-4 shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
			>
				<div className="flex items-center justify-between">
					<h2 id={titleId} className="m-0 text-sm font-semibold">
						Switch Workspace
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-xs text-muted-foreground hover:underline"
					>
						Close
					</button>
				</div>

				{error && (
					<p className="mt-2 rounded-sm bg-muted px-2 py-1 text-xs text-destructive">
						{error}
					</p>
				)}

				<ul className="m-0 mt-3 flex flex-col gap-1 p-0">
					{workspaces?.map((w) => {
						const isCurrent = w._id === currentWorkspaceId;
						return (
							<li key={w._id} className="list-none">
								<button
									type="button"
									disabled={isCurrent}
									onClick={() => onSelect(w._id, w.name)}
									className={`block w-full rounded-sm border border-border px-3 py-2 text-left text-sm ${
										isCurrent
											? "cursor-default bg-sidebar-accent font-medium"
											: "bg-background hover:bg-sidebar-accent"
									}`}
								>
									{w.name}
									{isCurrent && (
										<span className="ms-2 text-xs text-muted-foreground">
											(current)
										</span>
									)}
								</button>
							</li>
						);
					})}
				</ul>

				<div className="mt-3 flex items-center justify-between border-t border-border pt-3">
					{!creating ? (
						<>
							<button
								type="button"
								onClick={() => setCreating(true)}
								className="text-xs text-muted-foreground hover:underline"
							>
								+ Create new Workspace
							</button>
							<button
								type="button"
								onClick={onDisconnect}
								className="text-xs text-muted-foreground hover:underline"
							>
								Disconnect
							</button>
						</>
					) : (
						<form onSubmit={handleCreate} className="flex flex-col gap-2">
							<input
								type="text"
								// biome-ignore lint/a11y/noAutofocus: deliberate — inline create form
								autoFocus
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Workspace name"
								disabled={busy}
								className="rounded-sm border border-border bg-background px-2 py-1 text-sm outline-none focus:border-ring"
							/>
							<div className="flex gap-2">
								<button
									type="submit"
									disabled={busy}
									className="rounded-sm bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
								>
									{busy ? "Creating…" : "Create"}
								</button>
								<button
									type="button"
									onClick={() => {
										setCreating(false);
										setName("");
									}}
									className="rounded-sm px-3 py-1 text-xs text-muted-foreground hover:bg-sidebar-accent"
								>
									Cancel
								</button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
