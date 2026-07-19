import { describe, expect, it } from "vitest";
import {
	dirname,
	fileKindForPath,
	hasDocumentExtension,
	isHiddenSidebarFolderName,
	isVisibleSidebarFileName,
	relativeWorkspacePath,
} from "./filePath";

describe("dirname", () => {
	it("preserves Windows drive roots", () => {
		expect(dirname("C:/index.html")).toBe("C:/");
		expect(dirname("C:\\index.html")).toBe("C:\\");
	});
});

describe("hasDocumentExtension", () => {
	it("matches files with rich and source viewer modes", () => {
		expect(hasDocumentExtension("note.md")).toBe(true);
		expect(hasDocumentExtension("app.html")).toBe(true);
		expect(hasDocumentExtension("app.HTM")).toBe(true);
		expect(hasDocumentExtension("image.png")).toBe(false);
	});
});

describe("fileKindForPath", () => {
	it("distinguishes editable, viewer, and external files", () => {
		expect(fileKindForPath("note.md")).toBe("document");
		expect(fileKindForPath("notes.TXT")).toBe("document");
		expect(fileKindForPath("notes.text")).toBe("document");
		expect(fileKindForPath("manual.PDF")).toBe("viewer");
		expect(fileKindForPath("image.png")).toBe("external");
		expect(fileKindForPath("LICENSE")).toBe("external");
	});
});

describe("isHiddenSidebarFolderName", () => {
	it("matches app-owned directories excluded from the sidebar", () => {
		expect(isHiddenSidebarFolderName(".hubble")).toBe(true);
		expect(isHiddenSidebarFolderName("note.assets")).toBe(true);
		expect(isHiddenSidebarFolderName("note.assets.backup")).toBe(false);
		expect(isHiddenSidebarFolderName("assets")).toBe(false);
	});
});

describe("isVisibleSidebarFileName", () => {
	it("hides dotfiles without hiding ordinary files", () => {
		expect(isVisibleSidebarFileName(".env")).toBe(false);
		expect(isVisibleSidebarFileName("manual.pdf")).toBe(true);
	});
});

describe("relativeWorkspacePath", () => {
	it("returns an empty path for the workspace root", () => {
		expect(relativeWorkspacePath("/vault", "/vault")).toBe("");
	});
});
