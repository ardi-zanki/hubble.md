import { TabStrip, type TabStripItem } from "@hubble.md/ui";
import { useStoreValue } from "@simplestack/store/react";
import type { RefObject } from "react";
import { isChangelogPath } from "../lib/changelogNote";
import { fileStem } from "../lib/filePath";
import {
	activateTab,
	closeTab,
	renameCurrentMarkdownFile,
	reorderTab,
} from "../store/actions";
import { tabsStore } from "../store/state";
import { tabLabels } from "../store/tabs";

/**
 * Supplies the Tab strip from the store, keeping `packages/ui` free of any
 * store coupling.
 */
export function DocumentTabs({
	onNewTab,
	newTabTitle,
	flushStart,
	onCollapsedChange,
	collapseTargetRef,
}: {
	onNewTab?: () => void;
	newTabTitle?: string;
	flushStart: boolean;
	onCollapsedChange: (collapsed: boolean) => void;
	collapseTargetRef: RefObject<HTMLButtonElement | null>;
}) {
	const tabs = useStoreValue(tabsStore);
	const labels = tabLabels(tabs);
	const items: TabStripItem[] = tabs.order.map((id) => ({
		id,
		label: labels[id] ?? "",
		title: isChangelogPath(tabs.byId[id]?.path)
			? "What's new"
			: (tabs.byId[id]?.path ?? ""),
		name: fileStem(tabs.byId[id]?.path ?? ""),
	}));

	return (
		<TabStrip
			tabs={items}
			flushStart={flushStart}
			onCollapsedChange={onCollapsedChange}
			collapseTargetRef={collapseTargetRef}
			activeTabId={tabs.activeTabId}
			onActivate={(id) => void activateTab(id)}
			onClose={(id) => void closeTab(id)}
			onReorder={reorderTab}
			onNewTab={onNewTab}
			newTabTitle={newTabTitle}
			onRename={
				isChangelogPath(
					tabs.activeTabId ? tabs.byId[tabs.activeTabId]?.path : null,
				)
					? undefined
					: (_id, nextName) => void renameCurrentMarkdownFile(nextName)
			}
		/>
	);
}
