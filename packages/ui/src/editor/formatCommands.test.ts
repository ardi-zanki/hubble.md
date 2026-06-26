// @vitest-environment happy-dom

import { Editor, type JSONContent } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { applyFormatCommand, isFormatActive } from "./formatCommands";

const editors: Editor[] = [];

afterEach(() => {
	for (const editor of editors) editor.destroy();
	editors.length = 0;
});

describe("applyFormatCommand / isFormatActive", () => {
	it("toggles inline marks on the selection", () => {
		const editor = createEditor(docWithParagraph("hello world"));
		selectText(editor, 1, 6); // "hello"

		applyFormatCommand(editor, "bold");
		expect(isFormatActive(editor, "bold")).toBe(true);
		expect(editor.getJSON()).toMatchObject({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "hello", marks: [{ type: "bold" }] },
						{ type: "text", text: " world" },
					],
				},
			],
		});

		applyFormatCommand(editor, "bold");
		expect(isFormatActive(editor, "bold")).toBe(false);
	});

	it("toggles strikethrough on the selection", () => {
		const editor = createEditor(docWithParagraph("hello world"));
		selectText(editor, 1, 6);

		applyFormatCommand(editor, "strike");
		expect(isFormatActive(editor, "strike")).toBe(true);

		applyFormatCommand(editor, "strike");
		expect(isFormatActive(editor, "strike")).toBe(false);
	});

	it("converts the current block to a heading and back to a paragraph", () => {
		const editor = createEditor(docWithParagraph("hello world"));
		selectText(editor, 1, 6);

		applyFormatCommand(editor, "heading2");
		expect(isFormatActive(editor, "heading2")).toBe(true);
		expect(isFormatActive(editor, "paragraph")).toBe(false);
		expect(editor.getJSON().content?.[0]).toMatchObject({
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "hello world" }],
		});

		applyFormatCommand(editor, "paragraph");
		expect(isFormatActive(editor, "paragraph")).toBe(true);
		expect(isFormatActive(editor, "heading2")).toBe(false);
	});
});

function createEditor(content: JSONContent) {
	const editor = new Editor({
		element: document.createElement("div"),
		extensions: [StarterKit],
		content,
	});
	editors.push(editor);
	Object.defineProperty(editor, "isFocused", { value: true });
	return editor;
}

function selectText(editor: Editor, from: number, to: number) {
	editor.view.dispatch(
		editor.state.tr.setSelection(
			TextSelection.create(editor.state.doc, from, to),
		),
	);
}

function docWithParagraph(text: string): JSONContent {
	return {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: text ? [{ type: "text", text }] : undefined,
			},
		],
	};
}
