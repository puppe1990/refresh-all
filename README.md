# Refresh All Extensions

[![CI](https://github.com/puppe1990/refresh-all/actions/workflows/ci.yml/badge.svg)](https://github.com/puppe1990/refresh-all/actions/workflows/ci.yml)

A Chrome extension (Manifest V3) with a popup button to **reload extensions without going through `chrome://extensions`**: pick the ones you want or reload them all at once.

No build step: the files are exactly what Chrome loads — no bundler, no compilation.

> The extension is listed in Chrome as **Recarregar Extensões** and its popup UI is in Brazilian Portuguese.

## Usage

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Click the extension icon in the toolbar to open the popup:
   - **Só extensões dev (unpacked)** filters the list; it is on by default and your choice is remembered;
   - **Selecionar todas** checks/unchecks the visible list;
   - **Recarregar selecionadas (n)** reloads only the checked ones;
   - **Recarregar todas (n)** reloads the whole visible list;
   - clicking an extension's **name** opens its page in `chrome://extensions` (Chrome's own manager).

Each row shows the name, the version and a `dev` badge when the extension is unpacked. When a run finishes, a summary tells what succeeded and why anything failed.

Selection and filter are remembered: close the popup and the checked extensions (and the filter state) are still there on the next open (`chrome.storage.local`). Ids of extensions that no longer exist — or that are hidden by the filter — are dropped when the list is built.

The `management` and `storage` permissions trigger the "Manage your apps, extensions, and themes" warning at install time — `management` is what allows listing and toggling extensions, `storage` keeps selection and filter. If you update this extension's files, changes to `manifest.json` (like permissions) only take effect after reloading it at `chrome://extensions` — the other files are read straight from disk every time the popup opens.

## How it works

Chrome does not expose a `chrome.management.reload()`. What exists is `chrome.management.setEnabled()`, and the Chromium code treats it as a **no-op when the requested state is the current one** (`extensions/browser/api/management/management_api.cc`). So the reload is:

```js
await chrome.management.setEnabled(id, false); // turn off
await chrome.management.setEnabled(id, true); // turn back on
```

which forces a full unload/load of the extension. Disabling requires no user gesture and shows no confirmation dialog; the native prompt only appears in the rare "permissions increase" enable case (and then the failure is reported on the row).

Limitations that come from this mechanism:

- **`manifest.json` changes** require a manual reload from the `chrome://extensions` page.
- **Disabled extensions, themes and apps** don't make it into the list (only enabled ones are worth reloading); extensions locked by policy (`mayDisable === false`) are skipped. With the dev filter on, only unpacked ones (`installType === 'development'`) are included.
- The **extension itself** cannot reload itself (Chrome blocks self-disable), so it is excluded from the list.
- Content scripts are not re-injected into already-open tabs; refresh the page you are developing if you need that.

## Structure

```
manifest.json   MV3 declaration + management/storage permissions + action.default_popup
popup.html      popup markup
popup.css       styles (light/dark)
popup.js        thin DOM glue: renders rows, filter and selection/filter persistence
lib/selection.js       selection model (Set), summary (none/partial/all) and restore of the saved selection
lib/extension-list.js  filters (dev/all) and sorts the chrome.management.getAll() result
lib/reload.js          disable→enable sequence, with per-item progress and errors
lib/storage.js         best-effort storage write (never throws, even without the permission)
test/                  unit tests for the lib/ modules
```

The `lib/` modules know neither the DOM nor the `chrome` object: they take the API as a parameter, so they run the same in the popup and in Node.

## Tests

```sh
npm test        # or: node --test
```

Written before the implementation (TDD): the suite covers selection (including restore with pruning of ids that no longer exist), list building (exclusions, dev-only filter and accent-aware sorting via `Intl.Collator pt-BR`) and reload orchestration (call order, progress, a failure that doesn't stop the rest). It uses only Node's test runner, no test framework.

The DOM layer (`popup.js`) is intentionally thin and was verified by loading the extension for real in a Chrome for Testing (headless), opening the popup, clicking "Recarregar selecionadas" and "Recarregar todas", and reopening the popup to check that selection and filter were restored.

## Scripts and pre-commit

```sh
npm install          # devDependencies + activates the hook (core.hooksPath=.githooks via prepare)
npm test             # node --test
npm run lint         # ESLint (flat config)
npm run lint:fix     # ESLint with --fix
npm run format       # Prettier --write
npm run format:check # Prettier --check
```

The `.githooks/pre-commit` hook runs **lint + prettier --check + tests** before every commit — a commit with broken lint, off-standard formatting or a red test is blocked. `npm install` sets `core.hooksPath` automatically (the `prepare` script); to enable it by hand: `git config core.hooksPath .githooks`.

CI (`.github/workflows/ci.yml`) runs exactly the same three steps on pushes to `main` and on pull requests.
