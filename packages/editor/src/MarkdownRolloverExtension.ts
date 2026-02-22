import { Extension } from '@tiptap/core';
import type { Mark, MarkType } from '@tiptap/pm/model';
import {
	type EditorState,
	Plugin,
	PluginKey,
	TextSelection,
	type Transaction,
} from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

type CursorSide = 'inside' | 'outside';
type BoundaryType = 'start' | 'end';
type BoundaryMatch = { markType: MarkType; boundary: BoundaryType };
type RolloverBoundaryState = {
	boundaryPos: number;
	markName: string;
	side: CursorSide;
} | null;

const MARK_PRIORITY = ['code', 'bold', 'italic', 'strike'] as const;
const DELIMITER_BY_MARK: Record<string, string> = {
	code: '`',
	bold: '**',
	italic: '*',
	strike: '~~',
};

const MarkdownRolloverKey = new PluginKey<RolloverBoundaryState>(
	'markdownRollover',
);

export const MarkdownRolloverExtension = Extension.create({
	name: 'markdownRollover',

	addProseMirrorPlugins() {
		return [
			new Plugin<RolloverBoundaryState>({
				key: MarkdownRolloverKey,
				state: {
					init: (_config, state) => deriveBoundaryState(state, null),
					apply: (tr, prev, _oldState, newState) => {
						const meta = tr.getMeta(MarkdownRolloverKey) as
							| RolloverBoundaryState
							| undefined;
						if (meta !== undefined) return meta;

						const mappedPrev =
							prev && tr.docChanged
								? {
										...prev,
										boundaryPos: tr.mapping.map(prev.boundaryPos),
									}
								: prev;

						return deriveBoundaryState(newState, mappedPrev);
					},
				},
				props: {
					handleKeyDown: (view, event) => {
						if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
							return false;
						}

						const next = getBoundaryTransition(view, event.key);
						if (!next) return false;

						const tr = view.state.tr.setSelection(
							TextSelection.create(view.state.doc, next.boundaryPos),
						);
						setStoredMarkIntent(tr, view.state, next.markType, next.side);
						tr.setMeta(MarkdownRolloverKey, {
							boundaryPos: next.boundaryPos,
							markName: next.markType.name,
							side: next.side,
						} satisfies NonNullable<RolloverBoundaryState>);
						view.dispatch(tr);
						event.preventDefault();
						return true;
					},
					handleClick: (view, pos, event) => {
						const target = event.target as HTMLElement | null;
						const delimiter = target?.closest(
							'.pm-md-delimiter',
						) as HTMLElement | null;
						if (!delimiter) return false;

						const markName = delimiter.dataset.mark;
						const boundary = delimiter.dataset.boundary as BoundaryType | undefined;
						const boundaryPos = Number(delimiter.dataset.pos);
						if (!markName || !boundary || Number.isNaN(boundaryPos)) return false;

						const markType = view.state.schema.marks[markName];
						if (!markType) return false;

						const rect = delimiter.getBoundingClientRect();
						const mouseEvent = event as MouseEvent;
						const sideOfDelimiter: 'left' | 'right' =
							mouseEvent.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
						const side =
							boundary === 'start'
								? sideOfDelimiter === 'left'
									? 'outside'
									: 'inside'
								: sideOfDelimiter === 'left'
									? 'inside'
									: 'outside';

						const tr = view.state.tr.setSelection(
							TextSelection.create(view.state.doc, boundaryPos),
						);
						setStoredMarkIntent(tr, view.state, markType, side);
						tr.setMeta(MarkdownRolloverKey, {
							boundaryPos,
							markName,
							side,
						} satisfies NonNullable<RolloverBoundaryState>);
						view.dispatch(tr);
						event.preventDefault();
						return true;
					},
					decorations: (state) => {
						const active = getActiveMarkContext(state);
						if (!active) return null;
						const delimiter = DELIMITER_BY_MARK[active.markType.name];
						if (!delimiter) return null;

						const boundaryState = MarkdownRolloverKey.getState(state) ?? null;
						const startCaretClass = getCaretClassForBoundary(
							boundaryState,
							active.markType,
							active.from,
							'start',
						);
						const endCaretClass = getCaretClassForBoundary(
							boundaryState,
							active.markType,
							active.to,
							'end',
						);

						const startWidget = Decoration.widget(
							active.from,
							() =>
								createDelimiterWidget({
									delimiter,
									markName: active.markType.name,
									boundary: 'start',
									pos: active.from,
									caretClass: startCaretClass,
								}),
							{ side: -1 },
						);
						const endWidget = Decoration.widget(
							active.to,
							() =>
								createDelimiterWidget({
									delimiter,
									markName: active.markType.name,
									boundary: 'end',
									pos: active.to,
									caretClass: endCaretClass,
								}),
							{ side: 1 },
						);

						return DecorationSet.create(state.doc, [startWidget, endWidget]);
					},
				},
			}),
		];
	},
});

function createDelimiterWidget({
	delimiter,
	markName,
	boundary,
	pos,
	caretClass,
}: {
	delimiter: string;
	markName: string;
	boundary: BoundaryType;
	pos: number;
	caretClass: string | null;
}) {
	const span = document.createElement('span');
	span.className = `pm-md-delimiter pm-md-delimiter-${boundary}${caretClass ? ` ${caretClass}` : ''}`;
	span.dataset.mark = markName;
	span.dataset.boundary = boundary;
	span.dataset.pos = String(pos);
	span.contentEditable = 'false';
	span.textContent = delimiter;
	return span;
}

function getCaretClassForBoundary(
	boundaryState: RolloverBoundaryState,
	markType: MarkType,
	pos: number,
	boundary: BoundaryType,
): string | null {
	if (
		!boundaryState ||
		boundaryState.boundaryPos !== pos ||
		boundaryState.markName !== markType.name
	) {
		return null;
	}

	if (boundary === 'start') {
		return boundaryState.side === 'inside'
			? 'pm-md-caret-right'
			: 'pm-md-caret-left';
	}

	return boundaryState.side === 'inside'
		? 'pm-md-caret-left'
		: 'pm-md-caret-right';
}

function getBoundaryTransition(
	view: EditorView,
	key: 'ArrowLeft' | 'ArrowRight',
): { boundaryPos: number; markType: MarkType; side: CursorSide } | null {
	const { state } = view;
	const { selection } = state;
	if (!selection.empty) return null;

	const boundaryMatch = getBoundaryMatchAtPos(state, selection.from);
	if (!boundaryMatch) return null;

	const boundaryState = MarkdownRolloverKey.getState(state) ?? null;
	const currentSide = getCurrentCursorSide(state, boundaryMatch.markType, boundaryState);

	const nextSide = getNextSideForArrow({
		boundary: boundaryMatch.boundary,
		currentSide,
		key,
	});
	if (!nextSide || nextSide === currentSide) return null;

	return {
		boundaryPos: selection.from,
		markType: boundaryMatch.markType,
		side: nextSide,
	};
}

function getNextSideForArrow({
	boundary,
	currentSide,
	key,
}: {
	boundary: BoundaryType;
	currentSide: CursorSide;
	key: 'ArrowLeft' | 'ArrowRight';
}): CursorSide | null {
	if (boundary === 'start') {
		if (key === 'ArrowLeft' && currentSide === 'inside') return 'outside';
		if (key === 'ArrowRight' && currentSide === 'outside') return 'inside';
		return null;
	}

	if (key === 'ArrowLeft' && currentSide === 'outside') return 'inside';
	if (key === 'ArrowRight' && currentSide === 'inside') return 'outside';
	return null;
}

function deriveBoundaryState(
	state: EditorState,
	prev: RolloverBoundaryState,
): RolloverBoundaryState {
	const { selection } = state;
	if (!selection.empty) return null;

	const boundaryMatch = getBoundaryMatchAtPos(state, selection.from);
	if (!boundaryMatch) return null;

	if (
		prev &&
		prev.boundaryPos === selection.from &&
		prev.markName === boundaryMatch.markType.name
	) {
		return prev;
	}

	return {
		boundaryPos: selection.from,
		markName: boundaryMatch.markType.name,
		side: isMarkActiveForInsertion(state, boundaryMatch.markType)
			? 'inside'
			: 'outside',
	};
}

function getActiveMarkContext(
	state: EditorState,
): { markType: MarkType; from: number; to: number } | null {
	const { selection } = state;
	if (!selection.empty) return null;

	const pos = selection.from;
	const markType = getPreferredMarkAtPos(state, pos);
	if (!markType) return null;

	const range = findMarkRangeAtPos(state, pos, markType);
	if (!range || range.from >= range.to) return null;
	return { markType, from: range.from, to: range.to };
}

function getPreferredMarkAtPos(
	state: EditorState,
	pos: number,
): MarkType | null {
	const markFromStored = findByPriority(
		state,
		state.storedMarks ?? state.selection.$from.marks(),
	);
	if (markFromStored) return markFromStored;

	const $pos = state.doc.resolve(pos);
	const before = findByPriority(state, $pos.nodeBefore?.marks ?? []);
	if (before) return before;

	return findByPriority(state, $pos.nodeAfter?.marks ?? []);
}

function getBoundaryMatchAtPos(
	state: EditorState,
	pos: number,
): BoundaryMatch | null {
	const $pos = state.doc.resolve(pos);
	const beforeMarks = $pos.nodeBefore?.marks ?? [];
	const afterMarks = $pos.nodeAfter?.marks ?? [];

	for (const markName of MARK_PRIORITY) {
		const markType = state.schema.marks[markName];
		if (!markType) continue;
		const hasBefore = !!markType.isInSet(beforeMarks);
		const hasAfter = !!markType.isInSet(afterMarks);
		if (!hasBefore && hasAfter) return { markType, boundary: 'start' };
		if (hasBefore && !hasAfter) return { markType, boundary: 'end' };
	}

	return null;
}

function getCurrentCursorSide(
	state: EditorState,
	markType: MarkType,
	boundaryState: RolloverBoundaryState,
): CursorSide {
	if (
		boundaryState &&
		boundaryState.boundaryPos === state.selection.from &&
		boundaryState.markName === markType.name
	) {
		return boundaryState.side;
	}
	return isMarkActiveForInsertion(state, markType) ? 'inside' : 'outside';
}

function setStoredMarkIntent(
	tr: Transaction,
	state: EditorState,
	markType: MarkType,
	side: CursorSide,
) {
	if (side === 'inside') {
		const mark = markType.create();
		const activeMarks = tr.storedMarks ?? state.selection.$from.marks();
		if (!markType.isInSet(activeMarks ?? [])) {
			tr.addStoredMark(mark);
		}
		return;
	}

	tr.removeStoredMark(markType);
}

function isMarkActiveForInsertion(
	state: EditorState,
	markType: MarkType,
) {
	const marks = state.storedMarks ?? state.selection.$from.marks();
	return !!markType.isInSet(marks);
}

function findByPriority(
	state: EditorState,
	marks: readonly Mark[],
): MarkType | null {
	for (const markName of MARK_PRIORITY) {
		const markType = state.schema.marks[markName];
		if (markType && markType.isInSet(marks)) {
			return markType;
		}
	}
	return null;
}

function findMarkRangeAtPos(
	state: EditorState,
	pos: number,
	markType: MarkType,
): { from: number; to: number } | null {
	const $pos = state.doc.resolve(pos);
	const parent = $pos.parent;

	let index: number | null = null;
	if ($pos.nodeAfter && markType.isInSet($pos.nodeAfter.marks)) {
		index = $pos.index();
	} else if ($pos.nodeBefore && markType.isInSet($pos.nodeBefore.marks)) {
		index = $pos.index() - 1;
	}
	if (index === null || index < 0 || index >= parent.childCount) return null;

	let startIndex = index;
	let endIndex = index;

	let from = $pos.start();
	for (let i = 0; i < startIndex; i++) {
		from += parent.child(i).nodeSize;
	}
	let to = from + parent.child(index).nodeSize;

	while (
		startIndex > 0 &&
		!!markType.isInSet(parent.child(startIndex - 1).marks)
	) {
		startIndex -= 1;
		from -= parent.child(startIndex).nodeSize;
	}

	while (
		endIndex + 1 < parent.childCount &&
		!!markType.isInSet(parent.child(endIndex + 1).marks)
	) {
		endIndex += 1;
		to += parent.child(endIndex).nodeSize;
	}

	return { from, to };
}
