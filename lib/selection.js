export function createSelection() {
  const ids = new Set();

  return {
    get size() {
      return ids.size;
    },
    has(id) {
      return ids.has(id);
    },
    ids() {
      return [...ids];
    },
    toggle(id) {
      if (ids.has(id)) {
        ids.delete(id);
      } else {
        ids.add(id);
      }
    },
    selectAll(allIds) {
      ids.clear();
      for (const id of allIds) {
        ids.add(id);
      }
    },
    clear() {
      ids.clear();
    },
  };
}

export function collectSelected(extensions, selection) {
  return extensions.filter((extension) => selection.has(extension.id));
}

export function restoreSelection(selection, savedIds, extensions) {
  const saved = new Set(savedIds);
  const restoredIds = extensions
    .filter((extension) => saved.has(extension.id))
    .map((extension) => extension.id);

  selection.selectAll(restoredIds);

  return restoredIds;
}

export function selectionSummary(selection, total) {
  const count = selection.size;

  return {
    count,
    total,
    all: total > 0 && count === total,
    some: count > 0 && count < total,
    none: count === 0,
  };
}
