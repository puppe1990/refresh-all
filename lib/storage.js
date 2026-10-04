// Grava sem nunca lançar: chrome.storage?.local fica undefined quando a extensão
// carregada está desatualizada (manifest sem a permissão "storage"), e um throw
// aqui não pode derrubar o handler que atualiza o popup.
export function writeStorage(area, values) {
  try {
    area.set(values).catch(() => {});
    return true;
  } catch {
    return false;
  }
}
