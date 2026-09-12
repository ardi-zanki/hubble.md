// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WindowTitleBar } from "./WindowTitleBar";

const state = vi.hoisted(() => ({
	sidebarOpen: false,
	compact: false,
	fullScreen: false,
	onFullScreenChange: undefined as ((value: boolean) => void) | undefined,
	toggleSidebar: vi.fn(),
	unsubscribe: vi.fn(),
}));

vi.mock("../desktopApi", () => ({
	desktopApi: {
		platform: "darwin",
		getFullScreen: async () => state.fullScreen,
		onFullScreenChange: (callback: (value: boolean) => void) => {
			state.onFullScreenChange = callback;
			return state.unsubscribe;
		},
	},
}));
vi.mock("@simplestack/store/react", () => ({
	useStoreValue: () => state.sidebarOpen,
}));
vi.mock("../store/state", () => ({ sidebarOpenStore: {} }));
vi.mock("../store/actions", () => ({ toggleSidebar: state.toggleSidebar }));
vi.mock("../lib/layout", () => ({ useCompactWindow: () => state.compact }));
vi.mock("./DocumentTabs", () => ({
	DocumentTabs: ({ flushStart }: { flushStart: boolean }) => (
		<div data-tabs-flush-start={String(flushStart)} />
	),
}));

describe("WindowTitleBar", () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		state.sidebarOpen = false;
		state.compact = false;
		state.fullScreen = false;
		state.onFullScreenChange = undefined;
		container = document.createElement("div");
		document.body.append(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	async function render() {
		await act(async () => root.render(<WindowTitleBar />));
	}

	it("keeps blank titlebar space draggable and the sidebar toggle clickable", async () => {
		await render();
		const bar = container.querySelector<HTMLElement>("[data-window-title-bar]");
		const toggle = container.querySelector<HTMLButtonElement>(
			"[data-sidebar-toggle]",
		);
		expect(appRegion(bar)).toBe("drag");
		expect(appRegion(toggle)).toBe("no-drag");
		expect(appRegion(toggle?.parentElement)).not.toBe("no-drag");
		await act(async () => toggle?.click());
		expect(state.toggleSidebar).toHaveBeenCalledOnce();
	});

	it.each([
		{ sidebarOpen: true, compact: false, flush: "true" },
		{ sidebarOpen: false, compact: false, flush: "false" },
		{ sidebarOpen: true, compact: true, flush: "false" },
	])("uses the sidebar seam only when docked: $sidebarOpen / $compact", async ({
		sidebarOpen,
		compact,
		flush,
	}) => {
		state.sidebarOpen = sidebarOpen;
		state.compact = compact;
		await render();
		expect(
			container
				.querySelector("[data-tabs-flush-start]")
				?.getAttribute("data-tabs-flush-start"),
		).toBe(flush);
	});

	it("releases traffic-light space in fullscreen and restores it on exit", async () => {
		await render();
		const controls = container.querySelector<HTMLElement>(
			"[data-sidebar-toggle]",
		)?.parentElement;
		const inset = controls?.style.paddingInlineStart;
		expect(inset).toContain("--hubble-traffic-light-inset");
		await act(async () => state.onFullScreenChange?.(true));
		expect(controls?.style.paddingInlineStart).toMatch(/^0(px)?$/);
		await act(async () => state.onFullScreenChange?.(false));
		expect(controls?.style.paddingInlineStart).toBe(inset);
	});
});

function appRegion(element: HTMLElement | null | undefined) {
	return (
		element?.style as
			| (CSSStyleDeclaration & { WebkitAppRegion?: string })
			| undefined
	)?.WebkitAppRegion;
}
