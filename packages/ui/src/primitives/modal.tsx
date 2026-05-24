import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import MingcuteCloseLine from "~icons/mingcute/close-line";
import { cn } from "../lib/utils";
import { Button } from "./button";

type Props = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	title: string;
	description?: string;
	className?: string;
	children: ReactNode;
};

function Modal({
	open,
	onOpenChange,
	title,
	description,
	className,
	children,
}: Props) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-[var(--default-transition-duration)] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
				<Dialog.Popup
					className={cn(
						"fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-sm border border-border bg-popover p-4 text-popover-foreground shadow-panel inset-shadow-chrome outline-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
						className,
					)}
				>
					<div className="mb-3 flex items-start justify-between gap-3">
						<div className="flex min-w-0 flex-col gap-1">
							<Dialog.Title className="m-0 text-sm font-semibold">
								{title}
							</Dialog.Title>
							{description && (
								<Dialog.Description className="m-0 text-xs text-muted-foreground">
									{description}
								</Dialog.Description>
							)}
						</div>
						<Dialog.Close
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Close"
									type="button"
								>
									<MingcuteCloseLine />
								</Button>
							}
						/>
					</div>
					{children}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

export { Modal };
