import type { Editor } from "@tiptap/core";

/**
 * The set of formatting actions Hubble exposes on top of its editor commands.
 * Shared by the `Cmd+/` format command menu and the selection toolbar so both
 * apply formatting and report active state identically.
 */
export type FormatCommandKind =
	| "paragraph"
	| "heading1"
	| "heading2"
	| "heading3"
	| "bulletList"
	| "orderedList"
	| "taskList"
	| "blockquote"
	| "divider"
	| "bold"
	| "italic"
	| "strike"
	| "link";

export function isFormatActive(editor: Editor, kind: FormatCommandKind) {
	const taskListActive =
		editor.isActive("listItem", { checked: false }) ||
		editor.isActive("listItem", { checked: true });

	switch (kind) {
		case "paragraph":
			return (
				editor.isActive("paragraph") &&
				!editor.isActive("bulletList") &&
				!editor.isActive("orderedList") &&
				!editor.isActive("blockquote")
			);
		case "heading1":
			return editor.isActive("heading", { level: 1 });
		case "heading2":
			return editor.isActive("heading", { level: 2 });
		case "heading3":
			return editor.isActive("heading", { level: 3 });
		case "bulletList":
			return editor.isActive("bulletList") && !taskListActive;
		case "orderedList":
			return editor.isActive("orderedList");
		case "taskList":
			return taskListActive;
		case "blockquote":
			return editor.isActive("blockquote");
		case "bold":
			return editor.isActive("bold");
		case "italic":
			return editor.isActive("italic");
		case "strike":
			return editor.isActive("strike");
		case "link":
			return editor.isActive("link");
		case "divider":
			return false;
	}
}

export function applyFormatCommand(editor: Editor, kind: FormatCommandKind) {
	const chain = editor.chain().focus(undefined, { scrollIntoView: false });

	switch (kind) {
		case "paragraph":
			chain.setParagraph().run();
			return;
		case "heading1":
			chain.setHeading({ level: 1 }).run();
			return;
		case "heading2":
			chain.setHeading({ level: 2 }).run();
			return;
		case "heading3":
			chain.setHeading({ level: 3 }).run();
			return;
		case "bulletList":
			chain.toggleParentBulletList().run();
			return;
		case "orderedList":
			chain.toggleParentOrderedList().run();
			return;
		case "taskList":
			chain.toggleParentTaskList().run();
			return;
		case "blockquote":
			chain.toggleBlockquote().run();
			return;
		case "divider":
			chain.setHorizontalRule().run();
			return;
		case "bold":
			chain.toggleBold().run();
			return;
		case "italic":
			chain.toggleItalic().run();
			return;
		case "strike":
			chain.toggleStrike().run();
			return;
		case "link":
			editor.commands.focus(undefined, { scrollIntoView: false });
			editor.commands.toggleLinkAtSelection();
			return;
	}
}
