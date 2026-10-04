import { buildReloadList } from './lib/extension-list.js';
import { reloadAll } from './lib/reload.js';
import {
  collectSelected,
  createSelection,
  restoreSelection,
  selectionSummary,
} from './lib/selection.js';
import { writeStorage } from './lib/storage.js';

const SELECTION_KEY = 'selectedIds';
const FILTER_KEY = 'devOnly';
const STORAGE_DEFAULTS = { [SELECTION_KEY]: [], [FILTER_KEY]: true };

const listElement = document.querySelector('#extension-list');
const emptyElement = document.querySelector('#empty');
const countElement = document.querySelector('#count');
const selectAllInput = document.querySelector('#select-all');
const devOnlyInput = document.querySelector('#filter-dev');
const reloadSelectedButton = document.querySelector('#reload-selected');
const reloadAllButton = document.querySelector('#reload-all');
const statusElement = document.querySelector('#status');

const selection = createSelection();
const rows = new Map();
let installed = [];
let extensions = [];
let devOnly = STORAGE_DEFAULTS[FILTER_KEY];
let busy = false;

async function loadSavedState() {
  try {
    return await chrome.storage.local.get(STORAGE_DEFAULTS);
  } catch {
    return STORAGE_DEFAULTS;
  }
}

function persistSelection() {
  writeStorage(chrome.storage?.local, { [SELECTION_KEY]: selection.ids() });
}

function persistFilter() {
  writeStorage(chrome.storage?.local, { [FILTER_KEY]: devOnly });
}

function createRow(extension) {
  const item = document.createElement('li');
  item.className = 'extension';

  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.addEventListener('change', () => {
    selection.toggle(extension.id);
    syncControls();
    persistSelection();
  });

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = extension.name;
  name.title = extension.name;
  label.append(checkbox, name);

  const meta = document.createElement('span');
  meta.className = 'meta';
  if (extension.unpacked) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'dev';
    meta.append(badge);
  }
  const version = document.createElement('span');
  version.textContent = extension.version;
  meta.append(version);

  const state = document.createElement('span');
  state.className = 'state';

  item.append(label, meta, state);
  listElement.append(item);

  rows.set(extension.id, { checkbox, state });
}

function syncControls() {
  const summary = selectionSummary(selection, extensions.length);

  selectAllInput.checked = summary.all;
  selectAllInput.indeterminate = summary.some;
  selectAllInput.disabled = busy || summary.total === 0;

  reloadSelectedButton.disabled = busy || summary.count === 0;
  reloadSelectedButton.textContent = `Recarregar selecionadas (${summary.count})`;

  reloadAllButton.disabled = busy || summary.total === 0;
  reloadAllButton.textContent = `Recarregar todas (${summary.total})`;

  countElement.textContent = summary.total === 1 ? '1 extensão' : `${summary.total} extensões`;

  for (const extension of extensions) {
    const row = rows.get(extension.id);
    row.checkbox.checked = selection.has(extension.id);
    row.checkbox.disabled = busy;
  }
}

function renderList() {
  extensions = buildReloadList(installed, { selfId: chrome.runtime.id, devOnly });

  listElement.replaceChildren();
  rows.clear();
  for (const extension of extensions) {
    createRow(extension);
  }

  emptyElement.hidden = extensions.length > 0;
  emptyElement.textContent = devOnly
    ? 'Nenhuma extensão dev (unpacked) encontrada.'
    : 'Nenhuma extensão recarregável encontrada.';

  syncControls();
}

function showStatus(message) {
  statusElement.hidden = false;
  statusElement.textContent = message;
}

function nameOf(id) {
  return extensions.find((extension) => extension.id === id)?.name ?? id;
}

function summarizeResults(results) {
  const failures = results.filter((result) => !result.ok);

  if (failures.length === 0) {
    return results.length === 1
      ? '1 extensão recarregada.'
      : `${results.length} extensões recarregadas.`;
  }

  const details = failures.map((failure) => `${nameOf(failure.id)} (${failure.error})`).join(' • ');

  return `${results.length - failures.length} de ${results.length} recarregadas. Falhas: ${details}`;
}

async function runReload(ids) {
  if (busy || ids.length === 0) return;

  busy = true;
  for (const row of rows.values()) {
    row.state.className = 'state';
    row.state.textContent = '';
    row.state.title = '';
  }
  syncControls();
  showStatus(`Recarregando 0/${ids.length}…`);

  try {
    const results = await reloadAll(chrome.management, ids, {
      onProgress({ completed, total, result }) {
        const row = rows.get(result.id);
        row.state.className = `state ${result.ok ? 'ok' : 'error'}`;
        row.state.textContent = result.ok ? '✓' : '✕';
        row.state.title = result.error ?? '';
        statusElement.textContent = `Recarregando ${completed}/${total}…`;
      },
    });

    statusElement.textContent = summarizeResults(results);
  } catch (error) {
    showStatus(`Erro inesperado ao recarregar: ${error.message}`);
  } finally {
    busy = false;
    syncControls();
  }
}

devOnlyInput.addEventListener('change', () => {
  devOnly = devOnlyInput.checked;
  renderList();

  const selectedBefore = selection.size;
  restoreSelection(selection, selection.ids(), extensions);
  const selectionChanged = selection.size !== selectedBefore;

  syncControls();

  persistFilter();
  if (selectionChanged) {
    persistSelection();
  }
});

selectAllInput.addEventListener('change', () => {
  if (selectAllInput.checked) {
    selection.selectAll(extensions.map((extension) => extension.id));
  } else {
    selection.clear();
  }
  syncControls();
  persistSelection();
});

reloadSelectedButton.addEventListener('click', () => {
  const ids = collectSelected(extensions, selection).map((extension) => extension.id);
  runReload(ids);
});

reloadAllButton.addEventListener('click', () => {
  runReload(extensions.map((extension) => extension.id));
});

async function init() {
  try {
    installed = await chrome.management.getAll();
  } catch (error) {
    showStatus(`Não foi possível listar as extensões: ${error.message}`);
    return;
  }

  const saved = await loadSavedState();
  devOnly = saved[FILTER_KEY];
  devOnlyInput.checked = devOnly;

  renderList();

  const savedIds = saved[SELECTION_KEY];
  const restoredIds = restoreSelection(selection, savedIds, extensions);

  syncControls();

  if (restoredIds.length !== savedIds.length) {
    persistSelection();
  }

  if (!chrome.storage?.local) {
    showStatus(
      'Para lembrar a seleção, recarregue a extensão em chrome://extensions (permissão "storage" ausente).',
    );
  }
}

init();
