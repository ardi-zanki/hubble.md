#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs as parseNodeArgs } from "node:util";
import {
	createConvexBackend,
	createConvexSubscriber,
} from "@hubble.md/convex-client";
import {
	init,
	isInitialized,
	readConfig,
	sync as runSync,
	type SyncResult,
} from "@hubble.md/sync";
import { createNodeFileSystem } from "@hubble.md/sync/node";
import chokidar from "chokidar";

const fs = createNodeFileSystem();

function getConvexUrl(): string {
	return process.env.CONVEX_URL ?? "http://127.0.0.1:3210";
}

async function main() {
	const parsed = parseCliArgs(process.argv.slice(2));
	if ("error" in parsed) {
		console.error(parsed.error);
		printUsage();
		process.exitCode = 1;
		return;
	}

	const { command, continuous, extraArgs, workspacePath } = parsed;

	if (command === "init") {
		if (continuous || extraArgs.length > 0) {
			printUsage();
			process.exitCode = 1;
			return;
		}
		await runInit(workspacePath);
		return;
	}

	if (command !== "sync") {
		printUsage();
		process.exitCode = 1;
		return;
	}

	if (!(await isInitialized(fs, workspacePath))) {
		console.error(
			`No valid Hubble workspace in ${workspacePath}. Run \`hubble init\` first.`,
		);
		process.exitCode = 1;
		return;
	}

	if (extraArgs.length > 0) {
		printUsage();
		process.exitCode = 1;
		return;
	}

	if (!continuous) {
		await syncOnce(workspacePath, "manual");
		return;
	}

	await syncContinuously(workspacePath);
}

async function runInit(workspacePath: string) {
	const convexUrl = getConvexUrl();
	const backend = createConvexBackend(convexUrl);
	const workspaceName =
		workspacePath.split("/").pop() ??
		workspacePath.split("\\").pop() ??
		"default";
	const config = await init(backend, fs, { workspacePath, workspaceName });
	console.log(`Initialized workspace "${config.workspaceName}"`);
	console.log(`  device: ${config.deviceId}`);
}

async function syncOnce(workspacePath: string, reason: string) {
	const convexUrl = getConvexUrl();
	const backend = createConvexBackend(convexUrl);
	const result = await runSync(backend, fs, workspacePath);
	logResult(reason, result);
	return result;
}

async function syncContinuously(workspacePath: string) {
	const config = await readConfig(fs, workspacePath);
	const convexUrl = getConvexUrl();
	console.log(`Hubble Sync watching ${workspacePath}`);
	console.log(`Workspace: ${config.workspaceName}`);

	const scheduler = createSyncScheduler(workspacePath);
	await scheduler.enqueue("startup");

	const subscriber = createConvexSubscriber(convexUrl);
	const unsubscribe = subscriber.onFilesChanged(
		config.workspaceId,
		() => {
			void scheduler.enqueue("remote");
		},
		(err) => {
			console.error("Remote subscription failed:", err);
		},
	);

	let fsEventCount = 0;
	let fsTimer: ReturnType<typeof setTimeout> | null = null;
	const watcher = chokidar.watch(workspacePath, {
		ignoreInitial: true,
		ignored: (path) =>
			path.includes("/.hubble/") ||
			path.endsWith("/.hubble") ||
			path.includes("\\.hubble\\"),
	});

	const handleFsEvent = (event: string, path: string) => {
		fsEventCount += 1;
		console.log(`fs ${event}: ${path}`);
		if (fsTimer) clearTimeout(fsTimer);
		fsTimer = setTimeout(() => {
			const count = fsEventCount;
			fsEventCount = 0;
			void scheduler.enqueue(
				`filesystem (${count} event${count === 1 ? "" : "s"})`,
			);
		}, 250);
	};

	watcher
		.on("add", (path) => handleFsEvent("add", path))
		.on("change", (path) => handleFsEvent("change", path))
		.on("unlink", (path) => handleFsEvent("unlink", path))
		.on("addDir", (path) => handleFsEvent("addDir", path))
		.on("unlinkDir", (path) => handleFsEvent("unlinkDir", path))
		.on("error", (err) => {
			console.error("Workspace watcher failed:", err);
		});

	const shutdown = async (signal: string) => {
		console.log(`Stopping Hubble Sync (${signal})`);
		if (fsTimer) clearTimeout(fsTimer);
		unsubscribe();
		await subscriber.close();
		await watcher.close();
		process.exit(0);
	};

	process.on("SIGINT", () => {
		void shutdown("SIGINT");
	});
	process.on("SIGTERM", () => {
		void shutdown("SIGTERM");
	});
}

function createSyncScheduler(workspacePath: string) {
	let running = false;
	let pending = false;
	let pendingReason = "queued";

	const run = async (reason: string) => {
		if (running) {
			pending = true;
			pendingReason = reason;
			return;
		}

		running = true;
		let currentReason = reason;
		try {
			while (true) {
				await syncOnce(workspacePath, currentReason);
				if (!pending) break;
				pending = false;
				currentReason = pendingReason;
			}
		} finally {
			running = false;
		}
	};

	return {
		enqueue: run,
	};
}

function logResult(reason: string, result: SyncResult) {
	const files = `files(+${result.pushed.length} -${result.deleted.length} ↓${result.pulled.length})`;
	const assets = `assets(+${result.assetsPushed} -${result.assetsDeleted} ↓${result.assetsPulled})`;
	console.log(`sync ${reason}: ${files} ${assets}`);
	if (result.conflicts.length > 0) {
		console.log(`  conflicts: ${result.conflicts.join(", ")}`);
	}
}

function parseCliArgs(argv: string[]) {
	try {
		const args = argv[0] === "--" ? argv.slice(1) : argv;
		const { values, positionals } = parseNodeArgs({
			args,
			allowPositionals: true,
			options: {
				cwd: { type: "string" },
				continuous: { type: "boolean" },
			},
		});
		const [command, ...extraArgs] = positionals;
		return {
			command,
			continuous: values.continuous ?? false,
			extraArgs,
			workspacePath: values.cwd ? resolve(values.cwd) : process.cwd(),
		} as const;
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : String(error),
		} as const;
	}
}

function printUsage() {
	console.error("Usage:");
	console.error("  hubble [--cwd path] init");
	console.error("  hubble [--cwd path] sync");
	console.error("  hubble [--cwd path] sync --continuous");
}

void main();
