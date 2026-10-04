export async function reloadExtension(management, extensionId) {
  await management.setEnabled(extensionId, false);
  await management.setEnabled(extensionId, true);
}

export async function reloadAll(management, extensionIds, { onProgress = () => {} } = {}) {
  const total = extensionIds.length;
  const results = [];

  for (const [index, id] of extensionIds.entries()) {
    let result;

    try {
      await reloadExtension(management, id);
      result = { id, ok: true };
    } catch (error) {
      result = { id, ok: false, error: error.message };
    }

    results.push(result);
    onProgress({ completed: index + 1, total, result });
  }

  return results;
}
