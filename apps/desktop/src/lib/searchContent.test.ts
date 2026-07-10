import { describe, expect, it } from "vitest";
import { findMatchesInContent } from "./searchContent";

/** The excerpt slice that the UI will emphasize, for offset assertions. */
function highlighted(excerpt: string, start: number, end: number) {
	return excerpt.slice(start, end);
}

describe("findMatchesInContent", () => {
	it("returns 1-indexed line numbers", () => {
		const matches = findMatchesInContent("alpha\nbeta\ngamma", "beta");
		expect(matches).toHaveLength(1);
		expect(matches[0].line).toBe(2);
	});

	it("matches case-insensitively", () => {
		const matches = findMatchesInContent("The Pagefind Reference", "pagefind");
		expect(matches).toHaveLength(1);
		expect(highlighted(matches[0].excerpt, ...offsets(matches[0]))).toBe(
			"Pagefind",
		);
	});

	it("keeps the whole line when it fits in the context window", () => {
		const matches = findMatchesInContent("hello world", "world");
		expect(matches[0].excerpt).toBe("hello world");
		expect(highlighted(matches[0].excerpt, ...offsets(matches[0]))).toBe(
			"world",
		);
	});

	it("windows long lines and marks the clipped sides with ellipses", () => {
		const line = `${"a".repeat(100)}needle${"b".repeat(100)}`;
		const [match] = findMatchesInContent(line, "needle", 3, 10);
		expect(match.excerpt).toBe(`…${"a".repeat(10)}needle${"b".repeat(10)}…`);
		expect(highlighted(match.excerpt, ...offsets(match))).toBe("needle");
	});

	it("does not add a leading ellipsis when the window reaches the line start", () => {
		const [match] = findMatchesInContent(
			`needle${"b".repeat(100)}`,
			"needle",
			3,
			10,
		);
		expect(match.excerpt.startsWith("needle")).toBe(true);
		expect(highlighted(match.excerpt, ...offsets(match))).toBe("needle");
	});

	it("keeps offsets correct when leading indentation is trimmed", () => {
		const [match] = findMatchesInContent(
			"\t\t   indented needle here",
			"needle",
		);
		expect(match.excerpt).toBe("indented needle here");
		expect(highlighted(match.excerpt, ...offsets(match))).toBe("needle");
	});

	it("keeps offsets correct for a match at the very end of a line", () => {
		const [match] = findMatchesInContent("trailing needle   ", "needle");
		expect(highlighted(match.excerpt, ...offsets(match))).toBe("needle");
	});

	it("tolerates CRLF line endings", () => {
		const [match] = findMatchesInContent("one\r\nneedle here\r\n", "needle");
		expect(match.line).toBe(2);
		expect(highlighted(match.excerpt, ...offsets(match))).toBe("needle");
	});

	it("reports at most one match per line, and caps matches per file", () => {
		const content = "needle needle\nneedle\nneedle\nneedle";
		expect(findMatchesInContent(content, "needle", 3)).toHaveLength(3);
	});

	it("returns nothing for a blank query", () => {
		expect(findMatchesInContent("anything", "   ")).toEqual([]);
		expect(findMatchesInContent("anything", "")).toEqual([]);
	});

	it("returns nothing when the needle is absent", () => {
		expect(findMatchesInContent("alpha\nbeta", "gamma")).toEqual([]);
	});
});

function offsets(match: { matchStart: number; matchEnd: number }) {
	return [match.matchStart, match.matchEnd] as const;
}
