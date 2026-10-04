const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

export function buildReloadList(extensions, { selfId, devOnly = false }) {
  return extensions
    .filter(
      (extension) =>
        extension.type === 'extension' &&
        extension.id !== selfId &&
        extension.enabled === true &&
        extension.mayDisable !== false &&
        (!devOnly || extension.installType === 'development'),
    )
    .map((extension) => ({
      id: extension.id,
      name: extension.name,
      version: extension.version,
      unpacked: extension.installType === 'development',
    }))
    .sort((a, b) => nameCollator.compare(a.name, b.name));
}
