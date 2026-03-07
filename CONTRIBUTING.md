# Contributor Manual

We welcome contributions of any size. If you want help shaping an idea, scoping a change, or getting a PR over the finish line, open an issue and we'll work through it with you.

## Feature requests

We're open to feature requests of all kinds. If you have an idea for Hubble, we ask that you:
- **First open a GitHub issue** describing the problem you want to solve. If you already have a solution in mind, feel free to outline this too.
- For smaller fixes and documentation updates, you may open a PR to pair with your issue as well. We ask that discussion on the "why" be kept to GitHub issues, so we can use the PR to purely review implementation.
- For all other fixes and feature requests, we should have consensus on an approach in a GitHub issue before a reviewable PR is opened. Draft PRs before consensus are okay.

**⚠️ We strongly discourage PRs for undiscussed feature work!** Let's talk through the UX and architecture up-front so we can agree on what to build before we build it.

## Setup Guide

### Prerequisites

Install:

- [Node.js](https://nodejs.org/en/download)
- [pnpm](https://pnpm.io/installation)
- [Rust via rustup](https://www.rust-lang.org/tools/install)
- macOS desktop builds: Xcode Command Line Tools via `xcode-select --install`
- Windows / Linux desktop builds: the system dependencies from the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

### Run your first build

From the repo root:

```sh
pnpm install
pnpm bundle:desktop
```

On macOS, this creates `apps/desktop/src-tauri/target/release/bundle/macos/Hubble.app`.

### Development workflow

If you want the live desktop dev flow instead of a production bundle:

```sh
pnpm dev:desktop
```

### Run the tests

The shared editor package uses Vitest. You can run its tests with:

```sh
pnpm --filter @hubble.md/editor test
```

### Get ready for PR

Before opening a PR, please run:

```sh
pnpm build
```

If you changed editor behavior, also run:

```sh
pnpm --filter @hubble.md/editor test
```

## PR checklist

When making a PR, please ensure that you:

- link the issue you're addressing when relevant
- explain what changed
- describe how you tested it

If the change affects editor behavior or rendering, tests are strongly encouraged.
