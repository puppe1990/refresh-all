export function extensionManageUrl(extensionId) {
  return `chrome://extensions/?id=${encodeURIComponent(extensionId)}`;
}

export async function openManagePage(tabs, extensionId) {
  await tabs.create({ url: extensionManageUrl(extensionId) });
}
