import {
	LinkExtension,
	listExtensions,
	MarkdownRolloverExtension,
	markdownToTiptapDoc,
	tiptapDocToMarkdown,
} from "@hubble.md/editor";
import { TaskItem } from "@tiptap/extension-list";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { savePathContent, updateEditorContent } from "../store/actions";
import "./prose.css";

const SAVE_DEBOUNCE_MS = 120;

type Props = {
	path: string;
	initialMarkdown: string;
};

export function EditorView({ path, initialMarkdown }: Props) {
	const latestMarkdownRef = useRef(initialMarkdown);
	const saveTimerRef = useRef<number | null>(null);
	// pathRef holds the current path so the editor's stable onUpdate closure
	// can always read it. The editor itself is created once and persists
	// across file switches — only its content is swapped in via setContent —
	// so we can't rely on closure capture from useEditor's config.
	const pathRef = useRef(path);
	pathRef.current = path;

	// Only used at editor creation; ignore later initialMarkdown changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: editor created once at mount
	const initialDoc = useMemo(() => markdownToTiptapDoc(initialMarkdown), []);

	const scheduleSave = useCallback(() => {
		// Capture path at schedule time so the eventual save uses the path
		// the user was on when they typed, even if they switch before the
		// debounce fires.
		const savePath = pathRef.current;
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current);
		}
		saveTimerRef.current = window.setTimeout(() => {
			void savePathContent(savePath, latestMarkdownRef.current);
		}, SAVE_DEBOUNCE_MS);
	}, []);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({ listItem: false }),
			LinkExtension,
			MarkdownRolloverExtension,
			...listExtensions,
			TaskItem.configure({ nested: true }),
		],
		content: initialDoc,
		onUpdate: ({ editor: current }) => {
			const markdown = tiptapDocToMarkdown(current.getJSON() as JSONContent);
			latestMarkdownRef.current = markdown;
			updateEditorContent(pathRef.current, markdown);
			scheduleSave();
		},
		autofocus: "end",
		editorProps: {
			attributes: {
				class: "flex-1 outline-none",
			},
		},
	});

	// Sync editor content when a new file is loaded into the same editor
	// instance. setContent with emitUpdate: false avoids re-triggering save.
	useEffect(() => {
		if (!editor) return;
		latestMarkdownRef.current = initialMarkdown;
		const current = tiptapDocToMarkdown(editor.getJSON() as JSONContent);
		if (current === initialMarkdown) return;
		editor.commands.setContent(markdownToTiptapDoc(initialMarkdown), {
			emitUpdate: false,
		});
	}, [editor, initialMarkdown]);

	// On path change OR unmount, flush any pending debounced save for the
	// OLD path. The `path` closure here is the value at this effect's
	// activation; cleanup runs before the next effect body executes, so
	// latestMarkdownRef still holds the old file's content at that point.
	useEffect(() => {
		return () => {
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
				void savePathContent(path, latestMarkdownRef.current);
			}
		};
	}, [path]);

	const focusEditor = (event: React.MouseEvent<HTMLDivElement>) => {
		if (event.target !== event.currentTarget) return;
		editor?.commands.focus("end");
	};

	return (
		<div className="relative h-full overflow-auto overscroll-contain">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: click-to-focus for editor body */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard already focuses via tab into ProseMirror */}
			<div
				className="mx-auto flex min-h-full max-w-3xl flex-col px-6 py-6 text-[15px] leading-relaxed"
				onClick={focusEditor}
			>
				<EditorContent editor={editor} className="flex flex-1 flex-col" />
			</div>
		</div>
	);
}
