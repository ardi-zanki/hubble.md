import type { Editor } from "@tiptap/core";
import { type RefObject, useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { useEditorInputMode } from "./useEditorInputMode";

type CursorStyle = "hidden" | "solid" | "blinking";
type CursorPosition = {
	left: number;
	top: number;
	width: number;
	height: number;
};

const CURSOR_SCALE = 1.5;
const BLINK_DELAY_MS = 500;

export function VirtualCursor({
	editor,
	containerRef,
	viewportRef,
}: {
	editor: Editor | null;
	containerRef: RefObject<HTMLDivElement | null>;
	viewportRef: RefObject<HTMLDivElement | null>;
}) {
	const [cursorStyle, setCursorStyle] = useState<CursorStyle>("hidden");
	const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(
		null,
	);
	const [animatePosition, setAnimatePosition] = useState(true);
	const blinkTimeoutRef = useRef<number | null>(null);
	const { inputMode } = useEditorInputMode({ editor, containerRef });

	useEffect(() => {
		if (!editor) return;
		const scrollContainer = viewportRef.current;

		const clearBlinkTimeout = () => {
			if (blinkTimeoutRef.current !== null) {
				window.clearTimeout(blinkTimeoutRef.current);
				blinkTimeoutRef.current = null;
			}
		};

		const queueBlink = () => {
			setCursorStyle("solid");
			clearBlinkTimeout();
			blinkTimeoutRef.current = window.setTimeout(() => {
				setCursorStyle("blinking");
			}, BLINK_DELAY_MS);
		};

		const updateCursor = () => {
			const container = scrollContainer;
			if (!container || !editor.view) {
				setCursorStyle("hidden");
				return;
			}

			const { state, view } = editor;
			if (!state.selection.empty || !editor.isFocused) {
				setCursorStyle("hidden");
				return;
			}

			const rootRect = container.getBoundingClientRect();
			const coords = view.coordsAtPos(state.selection.head);
			const left = coords.left - rootRect.left + container.scrollLeft;
			const top = coords.top - rootRect.top + container.scrollTop;
			const height = Math.max(coords.bottom - coords.top, 1);

			const scaledHeight = height * CURSOR_SCALE;
			const topOffset = (scaledHeight - height) / 2;
			const width = scaledHeight * 0.02 + 2;
			setCursorPosition({
				left,
				top: top - topOffset,
				width,
				height: scaledHeight,
			});
			setAnimatePosition(inputMode === "keyboard");
			queueBlink();
		};

		updateCursor();
		editor.on("selectionUpdate", updateCursor);
		editor.on("transaction", updateCursor);
		editor.on("focus", updateCursor);
		editor.on("blur", updateCursor);
		scrollContainer?.addEventListener("scroll", updateCursor, {
			passive: true,
		});
		window.addEventListener("resize", updateCursor);

		return () => {
			editor.off("selectionUpdate", updateCursor);
			editor.off("transaction", updateCursor);
			editor.off("focus", updateCursor);
			editor.off("blur", updateCursor);
			scrollContainer?.removeEventListener("scroll", updateCursor);
			window.removeEventListener("resize", updateCursor);
			clearBlinkTimeout();
		};
	}, [editor, inputMode, viewportRef]);

	if (!cursorPosition || cursorStyle === "hidden") return null;

	return (
		<span
			className={cn(
				"pm-virtual-cursor",
				cursorStyle === "blinking" && "blinking",
				!animatePosition && "no-position-transition",
			)}
			aria-hidden="true"
			style={{
				left: `${cursorPosition.left}px`,
				top: `${cursorPosition.top}px`,
				width: `${cursorPosition.width}px`,
				height: `${cursorPosition.height}px`,
			}}
		/>
	);
}
