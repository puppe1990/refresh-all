import test from 'node:test';
import assert from 'node:assert/strict';

import { writeStorage } from '../lib/storage.js';

test('writeStorage grava os valores e devolve true', () => {
  const calls = [];
  const area = {
    set(values) {
      calls.push(values);
      return Promise.resolve();
    },
  };

  assert.equal(writeStorage(area, { a: 1 }), true);
  assert.deepEqual(calls, [{ a: 1 }]);
});

test('writeStorage devolve false quando a área de storage não existe', () => {
  // chrome.storage?.local fica undefined quando a extensão carregada é antiga
  // (manifest sem a permissão "storage")
  assert.equal(writeStorage(undefined, { a: 1 }), false);
});

test('writeStorage engole rejeição sem gerar unhandled rejection', async () => {
  const rejections = [];
  const onRejection = (reason) => rejections.push(reason);
  process.on('unhandledRejection', onRejection);

  try {
    const area = { set: () => Promise.reject(new Error('quota exceeded')) };

    assert.equal(writeStorage(area, { a: 1 }), true);

    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(rejections, []);
  } finally {
    process.off('unhandledRejection', onRejection);
  }
});
