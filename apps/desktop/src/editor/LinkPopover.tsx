import {
	computePosition,
	flip,
	offset,
	shift,
	type VirtualElement,
} from "@floating-ui/dom";
import { getActiveLinkRange } from "@hubble.md/editor";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Editor } from "@tiptap/core";
import { keymatch } from "keymatch";
import {
	type RefObject,
	useCallback,
	useEffect,
	useReducer,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import MingcutePencilFill from "~icons/mingcute/pencil-fill";
import { cn } from "../lib/utils";
import styles from "./LinkPopover.module.css";
import { FOCUS_LINK_POPOVER_EVENT } from "./SmartLinkExtension";
import { useEditorInputMode } from "./useEditorInputMode";

type PopoverMode = "hidden" | "preview" | "actions";
type MachineState = {
	mode: PopoverMode;
	activeKey: string | null;
};
type MachineEvent =
	| { type: "LINK_SESSION_CHANGED"; activeKey: string | null }
	| { type: "EXPAND_REQUESTED" }
	| { type: "TOGGLE_ACTIONS_REQUESTED" }
	| { type: "ESCAPE_REQUESTED" };
// Modes: hidden=dismissed for current link session, preview=compact chip,
// actions=expanded menu (input focus is managed by effect, not machine state).

const INITIAL_MACHINE_STATE: MachineState = {
	mode: "hidden",
	activeKey: null,
};

function machineReducer(
	state: MachineState,
	event: MachineEvent,
): MachineState {
	switch (event.type) {
		case "LINK_SESSION_CHANGED": {
			const { activeKey } = event;
			if (!activeKey) return INITIAL_MACHINE_STATE;
			if (state.activeKey !== activeKey) {
				return { mode: "preview", activeKey };
			}
			return { ...state, activeKey };
		}
		case "EXPAND_REQUESTED": {
			if (!state.activeKey) return state;
			return { ...state, mode: "actions" };
		}
		case "TOGGLE_ACTIONS_REQUESTED": {
			if (!state.activeKey) return state;
			if (state.mode === "preview") {
				return { ...state, mode: "actions" };
			}
			if (state.mode === "actions") {
				return { ...state, mode: "preview" };
			}
			return state;
		}
		case "ESCAPE_REQUESTED": {
			if (state.mode === "actions") {
				return { ...state, mode: "preview" };
			}
			if (state.mode === "preview" && state.activeKey) {
				return {
					...state,
					mode: "hidden",
				};
			}
			return state;
		}
		default:
			return state;
	}
}

async function copyLinkToClipboard(href: string) {
	try {
		await navigator.clipboard.writeText(href);
		toast.success("Link copied");
	} catch {
		toast.error("Failed to copy link");
	}
}

export function LinkPopover({
	editor,
	containerRef,
}: {
	editor: Editor | null;
	containerRef: RefObject<HTMLDivElement | null>;
}) {
	const [floatingX, setFloatingX] = useState(0);
	const [floatingY, setFloatingY] = useState(0);
	const [hrefValue, setHrefValue] = useState("");
	const [activeLink, setActiveLink] = useState<{
		from: number;
		to: number;
		href: string;
	} | null>(null);
	const [machineState, dispatch] = useReducer(
		machineReducer,
		INITIAL_MACHINE_STATE,
	);
	const { inputMode } = useEditorInputMode({ editor, containerRef });
	const inputRef = useRef<HTMLInputElement | null>(null);
	const popoverRef = useRef<HTMLDivElement | null>(null);
	const positionUpdateRef = useRef<(() => void) | null>(null);
	const machineStateRef = useRef(machineState);
	const [isPreviewEntering, setIsPreviewEntering] = useState(false);

	useEffect(() => {
		machineStateRef.current = machineState;
	}, [machineState]);

	useEffect(() => {
		if (machineState.mode !== "preview") {
			setIsPreviewEntering(false);
			return;
		}
		if (!isPreviewEntering) return;
		const frame = requestAnimationFrame(() => {
			setIsPreviewEntering(false);
			requestAnimationFrame(() => {
				positionUpdateRef.current?.();
			});
		});
		return () => window.cancelAnimationFrame(frame);
	}, [machineState.mode, isPreviewEntering]);

	const dispatchMachineEvent = useCallback((event: MachineEvent) => {
		const previousState = machineStateRef.current;
		const shouldAnimateHiddenToPreview =
			event.type === "LINK_SESSION_CHANGED" &&
			Boolean(event.activeKey) &&
			previousState.mode === "hidden" &&
			previousState.activeKey !== event.activeKey;

		if (shouldAnimateHiddenToPreview) {
			setIsPreviewEntering(true);
		}
		dispatch(event);
	}, []);

	useEffect(() => {
		if (!editor) return;
		const update = () => {
			const link = getActiveLinkRange(editor.state);
			setActiveLink(link);
			if (link) setHrefValue(link.href);
			const nextActiveKey = link ? `${link.from}:${link.to}` : null;
			dispatchMachineEvent({
				type: "LINK_SESSION_CHANGED",
				activeKey: nextActiveKey,
			});
			const container = containerRef.current;
			if (!container || !link) return;
			const floatingEl = popoverRef.current;
			if (!floatingEl) return;
			const selectionPos = editor.state.selection.from;
			const reference: VirtualElement = {
				contextElement: container,
				getBoundingClientRect() {
					const coords = editor.view.coordsAtPos(selectionPos);
					return {
						x: coords.left,
						y: coords.top,
						left: coords.left,
						top: coords.top,
						right: coords.right,
						bottom: coords.bottom,
						width: coords.right - coords.left,
						height: coords.bottom - coords.top,
						toJSON() {
							return this;
						},
					};
				},
			};

			void computePosition(reference, floatingEl, {
				strategy: "fixed",
				placement: "top",
				middleware: [
					offset(4),
					flip({ fallbackPlacements: ["bottom"] }),
					shift({ padding: 8 }),
				],
			}).then(({ x, y }) => {
				setFloatingX(x);
				setFloatingY(y);
			});
		};
		positionUpdateRef.current = update;

		update();
		editor.on("selectionUpdate", update);
		editor.on("transaction", update);
		editor.on("focus", update);
		editor.on("blur", update);
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);

		return () => {
			positionUpdateRef.current = null;
			editor.off("selectionUpdate", update);
			editor.off("transaction", update);
			editor.off("focus", update);
			editor.off("blur", update);
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [editor, containerRef, dispatchMachineEvent]);

	useEffect(() => {
		const onFocusRequest = () => {
			dispatchMachineEvent({ type: "EXPAND_REQUESTED" });
		};
		window.addEventListener(
			FOCUS_LINK_POPOVER_EVENT,
			onFocusRequest as EventListener,
		);
		return () => {
			window.removeEventListener(
				FOCUS_LINK_POPOVER_EVENT,
				onFocusRequest as EventListener,
			);
		};
	}, [dispatchMachineEvent]);

	useEffect(() => {
		positionUpdateRef.current?.();
		if (machineState.mode !== "actions") return;
		queueMicrotask(() => {
			inputRef.current?.focus();
			inputRef.current?.select();
		});
	}, [machineState.mode]);

	useEffect(() => {
		if (!editor || !activeLink) return;
		const onKeyDown = (event: KeyboardEvent) => {
			const isInputFocused = document.activeElement === inputRef.current;
			const isVisible = machineState.mode !== "hidden";

			if (
				isInputFocused &&
				hrefValue.length === 0 &&
				(event.key === "Backspace" || event.key === "Delete")
			) {
				event.preventDefault();
				event.stopPropagation();
				removeActiveLink(editor, activeLink.from, activeLink.to);
				return;
			}

			if (isInputFocused && keymatch(event, "Enter")) {
				event.preventDefault();
				dispatchMachineEvent({ type: "ESCAPE_REQUESTED" });
				editor.commands.focus(undefined, { scrollIntoView: false });
				return;
			}

			if ((isVisible || editor.isFocused) && keymatch(event, "Escape")) {
				const shouldReturnFocusToEditor =
					machineState.mode === "preview" || machineState.mode === "actions";
				queueMicrotask(() => {
					dispatchMachineEvent({ type: "ESCAPE_REQUESTED" });
					if (shouldReturnFocusToEditor) {
						editor.commands.focus(undefined, { scrollIntoView: false });
					}
				});
				return;
			}

			if (keymatch(event, "CmdOrCtrl+K")) {
				if (!isVisible) return;
				// Popover owns Cmd+K while visible to avoid editor shortcut races.
				event.preventDefault();
				event.stopPropagation();
				dispatchMachineEvent({ type: "TOGGLE_ACTIONS_REQUESTED" });
				return;
			}
			if (isVisible && keymatch(event, "CmdOrCtrl+Enter")) {
				event.preventDefault();
				event.stopPropagation();
				void visitLink(activeLink.href);
				return;
			}
			if (isVisible && keymatch(event, "CmdOrCtrl+Shift+C")) {
				event.preventDefault();
				event.stopPropagation();
				void copyLinkToClipboard(activeLink.href);
				return;
			}
		};

		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [editor, activeLink, machineState.mode, dispatchMachineEvent, hrefValue]);

	if (!editor || !activeLink || machineState.mode === "hidden") return null;

	const handleInput = (href: string) => {
		setHrefValue(href);
		const linkType = editor.state.schema.marks.link;
		if (!linkType) return;
		const tr = editor.state.tr.removeMark(
			activeLink.from,
			activeLink.to,
			linkType,
		);
		tr.addMark(activeLink.from, activeLink.to, linkType.create({ href }));
		editor.view.dispatch(tr);
	};

	const actionHintClass =
		"text-[9px] leading-[14px] tracking-[0.12em] text-muted-foreground/85";
	const actionButtonClass =
		"h-auto flex-1 rounded-none border-0 px-2 text-foreground shadow-none inset-shadow-none hover:bg-muted/80";
	return (
		<div
			ref={popoverRef}
			className={cn(
				"fixed z-[4] w-[250px] transition-position motion-reduce:transition-none",
				machineState.mode === "actions"
					? "duration-[var(--default-transition-duration)] ease-spring-snappy"
					: "duration-[var(--cursor-motion-duration)] ease-cursor-motion",
			)}
			style={{
				insetInlineStart: `${floatingX}px`,
				insetBlockStart: `${floatingY}px`,
			}}
		>
			{machineState.mode === "preview" ? (
				<div className="flex justify-center">
					<Button
						variant="outline"
						size="sm"
						className={cn(
							"h-7 min-w-0 justify-start gap-0 overflow-hidden border-border bg-card px-0 text-left shadow-panel inset-shadow-chrome hover:bg-card",
							styles.previewButton,
							isPreviewEntering && styles.previewButtonEnter,
						)}
						onTransitionEnd={() => {
							positionUpdateRef.current?.();
						}}
						onClick={() => dispatchMachineEvent({ type: "EXPAND_REQUESTED" })}
					>
						<span
							title={activeLink.href}
							className="min-w-0 flex-1 overflow-hidden px-2.5 py-[5px] pr-3 text-[11px] leading-[16px] text-foreground whitespace-nowrap [mask-image:linear-gradient(to_right,black_84%,transparent)] [-webkit-mask-image:linear-gradient(to_right,black_84%,transparent)]"
						>
							{activeLink.href}
						</span>
						<span className="relative flex h-full w-[42px] shrink-0 items-center justify-center overflow-hidden border-s border-border bg-primary text-primary-foreground">
							<span
								className={cn(
									"absolute inset-0 flex items-center justify-center text-[11px] font-semibold leading-[16px] tracking-[0.12em] transition-transform duration-[var(--default-transition-duration)] ease-spring-snappy",
									inputMode === "keyboard"
										? "translate-y-0"
										: "-translate-y-[120%]",
								)}
							>
								⌘K
							</span>
							<span
								className={cn(
									"absolute inset-0 flex items-center justify-center transition-transform duration-[var(--default-transition-duration)] ease-spring-snappy",
									inputMode === "keyboard"
										? "translate-y-[120%]"
										: "translate-y-0",
								)}
							>
								<MingcutePencilFill
									aria-label="Edit link"
									className="h-3 w-3"
								/>
							</span>
						</span>
					</Button>
				</div>
			) : (
				<div className="w-full overflow-hidden rounded-sm border border-border bg-popover shadow-panel">
					<div className="p-1">
						<Input
							ref={inputRef}
							type="text"
							value={hrefValue}
							placeholder="⌫ to remove link"
							onChange={(event) => handleInput(event.target.value)}
							className="h-7 rounded-[calc(var(--radius)-1px)] border-border bg-background px-2 py-[5px] text-[11px] leading-[16px]"
						/>
					</div>
					<Separator className="bg-border/90" />
					<div className="flex h-8 items-stretch text-[11px] leading-[16px]">
						<Button
							type="button"
							variant="ghost"
							size="xs"
							className={actionButtonClass}
							onClick={() =>
								removeActiveLink(editor, activeLink.from, activeLink.to)
							}
						>
							<span>Remove</span>
						</Button>
						<Separator
							orientation="vertical"
							className="self-stretch bg-border/90"
						/>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							className={actionButtonClass}
							onClick={() => {
								void copyLinkToClipboard(activeLink.href);
							}}
						>
							<span>Copy</span>
							<span className={actionHintClass}>⌘⇧C</span>
						</Button>
						<Separator
							orientation="vertical"
							className="self-stretch bg-border/90"
						/>
						<Button
							type="button"
							variant="default"
							size="xs"
							className="h-auto min-w-[72px] rounded-none border-0 px-2 text-primary-foreground shadow-none inset-shadow-none hover:brightness-105"
							onClick={() => {
								void visitLink(activeLink.href);
							}}
						>
							<span>Visit</span>
							<span className="text-[9px] leading-[14px] tracking-[0.12em] text-primary-foreground/75">
								⌘↩
							</span>
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function removeActiveLink(editor: Editor, from: number, to: number) {
	const linkType = editor.state.schema.marks.link;
	if (!linkType) return;
	const tr = editor.state.tr.removeMark(from, to, linkType);
	editor.view.dispatch(tr);
	editor.commands.focus(undefined, { scrollIntoView: false });
}

async function visitLink(href: string) {
	try {
		const parsed = new URL(href);
		const protocol = parsed.protocol.toLowerCase();
		if (protocol !== "http:" && protocol !== "https:") {
			toast.error("Only http(s) links can be opened");
			return;
		}
		await openUrl(href);
	} catch {
		toast.error("Invalid link URL");
	}
}
