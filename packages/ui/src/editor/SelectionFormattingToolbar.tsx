import {
	computePosition,
	flip,
	offset,
	shift,
	type VirtualElement,
} from "@floating-ui/dom";
import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { type ComponentType, type RefObject, useEffect, useState } from "react";
import MingcuteBoldLine from "~icons/mingcute/bold-line";
import MingcuteHeading1Line from "~icons/mingcute/heading-1-line";
import MingcuteHeading2Line from "~icons/mingcute/heading-2-line";
import MingcuteHeading3Line from "~icons/mingcute/heading-3-line";
import MingcuteItalicLine from "~icons/mingcute/italic-line";
import MingcuteLinkLine from "~icons/mingcute/link-line";
import MingcuteListCheck2Line from "~icons/mingcute/list-check-2-line";
import MingcuteListCheckLine from "~icons/mingcute/list-check-line";
import MingcuteListOrderedLine from "~icons/mingcute/list-ordered-line";
import MingcuteMore1Line from "~icons/mingcute/more-1-line";
import MingcuteQuoteLeftLine from "~icons/mingcute/quote-left-line";
import MingcuteStrikethroughLine from "~icons/mingcute/strikethrough-line";
import { cn } from "../lib/utils";
import { Button } from "../primitives/button";
import { Separator } from "../primitives/separator";
import { OPEN_FORMAT_COMMAND_MENU_EVENT } from "./FormatCommandMenu";
import {
	applyFormatCommand,
	type FormatCommandKind,
	isFormatActive,
} from "./formatCommands";

type ToolbarPosition = {
	x: number;
	y: number;
};

type ToolbarAction = {
	kind: FormatCommandKind;
	label: string;
	icon: ComponentType<{ className?: string }>;
};

// Inline marks and block styles surfaced directly on the toolbar. Less common
// commands (divider, plain text) stay in the `Cmd+/` menu behind "More".
const INLINE_ACTIONS: ToolbarAction[] = [
	{ kind: "bold", label: "Bold", icon: MingcuteBoldLine },
	{ kind: "italic", label: "Italic", icon: MingcuteItalicLine },
	{ kind: "strike", label: "Strikethrough", icon: MingcuteStrikethroughLine },
	{ kind: "link", label: "Link", icon: MingcuteLinkLine },
];

const HEADING_ACTIONS: ToolbarAction[] = [
	{ kind: "heading1", label: "Heading 1", icon: MingcuteHeading1Line },
	{ kind: "heading2", label: "Heading 2", icon: MingcuteHeading2Line },
	{ kind: "heading3", label: "Heading 3", icon: MingcuteHeading3Line },
];

const BLOCK_ACTIONS: ToolbarAction[] = [
	{ kind: "bulletList", label: "Bulleted list", icon: MingcuteListCheckLine },
	{
		kind: "orderedList",
		label: "Numbered list",
		icon: MingcuteListOrderedLine,
	},
	{ kind: "taskList", label: "To-do list", icon: MingcuteListCheck2Line },
	{ kind: "blockquote", label: "Quote", icon: MingcuteQuoteLeftLine },
];

function shouldShowToolbar(editor: Editor) {
	const { selection } = editor.state;
	if (!editor.isFocused) return false;
	if (selection.empty) return false;
	// Only plain text ranges are formattable; skip node selections (e.g. images)
	// and code blocks, where Markdown formatting does not apply.
	if (!(selection instanceof TextSelection)) return false;
	if (editor.isActive("codeBlock")) return false;
	return true;
}

/**
 * Floating formatting toolbar shown when text is selected. It is a
 * discoverability layer over the existing editor commands shared with the
 * `Cmd+/` format command menu, so it keeps emitting normal Markdown.
 */
export function SelectionFormattingToolbar({
	editor,
	viewportRef,
}: {
	editor: Editor | null;
	viewportRef: RefObject<HTMLDivElement | null>;
}) {
	const [position, setPosition] = useState<ToolbarPosition | null>(null);
	const [visible, setVisible] = useState(false);
	// Active marks/blocks are derived from editor state during render. Bump a
	// revision on every relevant change so the button highlights stay current
	// even when the toolbar's position does not move.
	const [, setRevision] = useState(0);
	const [toolbarEl, setToolbarEl] = useState<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!editor) return;

		const update = () => {
			if (!shouldShowToolbar(editor)) {
				setVisible(false);
				return;
			}
			setVisible(true);
			setRevision((value) => value + 1);

			const viewport = viewportRef.current;
			if (!viewport || !toolbarEl) return;

			const reference: VirtualElement = {
				contextElement: viewport,
				getBoundingClientRect() {
					const { from, to } = editor.state.selection;
					const start = editor.view.coordsAtPos(from);
					const end = editor.view.coordsAtPos(to);
					const left = Math.min(start.left, end.left);
					const right = Math.max(start.right, end.right);
					const top = Math.min(start.top, end.top);
					const bottom = Math.max(start.bottom, end.bottom);
					return {
						x: left,
						y: top,
						left,
						top,
						right,
						bottom,
						width: right - left,
						height: bottom - top,
						toJSON() {
							return this;
						},
					};
				},
			};

			void computePosition(reference, toolbarEl, {
				strategy: "absolute",
				placement: "top",
				middleware: [
					offset(8),
					flip({
						boundary: viewport,
						fallbackPlacements: ["bottom"],
						padding: 8,
					}),
					shift({ boundary: viewport, padding: 8 }),
				],
			}).then(({ x, y }) => setPosition({ x, y }));
		};

		update();
		const viewport = viewportRef.current;
		editor.on("selectionUpdate", update);
		editor.on("transaction", update);
		editor.on("focus", update);
		editor.on("blur", update);
		viewport?.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);

		return () => {
			editor.off("selectionUpdate", update);
			editor.off("transaction", update);
			editor.off("focus", update);
			editor.off("blur", update);
			viewport?.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, [editor, viewportRef, toolbarEl]);

	if (!editor) return null;

	return (
		<div
			ref={setToolbarEl}
			role="toolbar"
			aria-label="Text formatting"
			aria-hidden={!visible}
			className="absolute z-[4] flex items-center gap-0.5 rounded-[var(--radius-popover)] border border-border bg-popover p-1 text-popover-foreground shadow-overlay"
			style={{
				insetInlineStart: `${position?.x ?? 0}px`,
				insetBlockStart: `${position?.y ?? 0}px`,
				visibility: visible && position ? "visible" : "hidden",
				pointerEvents: visible ? "auto" : "none",
			}}
		>
			{INLINE_ACTIONS.map((action) => (
				<ToolbarButton key={action.kind} editor={editor} action={action} />
			))}
			<Separator orientation="vertical" className="mx-0.5" />
			{HEADING_ACTIONS.map((action) => (
				<ToolbarButton key={action.kind} editor={editor} action={action} />
			))}
			<Separator orientation="vertical" className="mx-0.5" />
			{BLOCK_ACTIONS.map((action) => (
				<ToolbarButton key={action.kind} editor={editor} action={action} />
			))}
			<Separator orientation="vertical" className="mx-0.5" />
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label="More formatting"
				title="More formatting"
				className="text-muted-foreground"
				onMouseDown={(event) => event.preventDefault()}
				onClick={() =>
					window.dispatchEvent(new CustomEvent(OPEN_FORMAT_COMMAND_MENU_EVENT))
				}
			>
				<MingcuteMore1Line className="size-4" />
			</Button>
		</div>
	);
}

function ToolbarButton({
	editor,
	action,
}: {
	editor: Editor;
	action: ToolbarAction;
}) {
	const Icon = action.icon;
	const active = isFormatActive(editor, action.kind);
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label={action.label}
			aria-pressed={active}
			title={action.label}
			className={cn(
				"text-muted-foreground",
				active && "bg-muted text-foreground",
			)}
			// Keep the editor selection intact when pressing a toolbar button.
			onMouseDown={(event) => event.preventDefault()}
			onClick={() => applyFormatCommand(editor, action.kind)}
		>
			<Icon className="size-4" />
		</Button>
	);
}
