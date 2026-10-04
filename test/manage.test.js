import test from 'node:test';
import assert from 'node:assert/strict';

import { extensionManageUrl, openManagePage } from '../lib/manage.js';

test('extensionManageUrl aponta para a página da extensão no chrome://extensions', () => {
  assert.equal(
    extensionManageUrl('abcdefghijklmnopabcdefghijklmnop'),
    'chrome://extensions/?id=abcdefghijklmnopabcdefghijklmnop',
  );
});

test('openManagePage abre uma aba com a URL de gerenciamento da extensão', async () => {
  const calls = [];
  const tabs = {
    async create(options) {
      calls.push(options);
    },
  };

  await openManagePage(tabs, 'abc');

  assert.deepEqual(calls, [{ url: 'chrome://extensions/?id=abc' }]);
});

test('openManagePage propaga erro de chrome.tabs.create', async () => {
  const tabs = {
    async create() {
      throw new Error('navegação bloqueada');
    },
  };

  await assert.rejects(() => openManagePage(tabs, 'abc'), /navegação bloqueada/);
});
