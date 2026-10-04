import test from 'node:test';
import assert from 'node:assert/strict';

import { reloadExtension, reloadAll } from '../lib/reload.js';

function createManagement({ failures = [] } = {}) {
  const calls = [];

  return {
    calls,
    async setEnabled(id, enabled) {
      calls.push([id, enabled]);
      if (failures.includes(`${id}:${enabled}`)) {
        throw new Error(`falha em ${id}:${enabled}`);
      }
    },
  };
}

test('reloadExtension desabilita e reabilita, nessa ordem', async () => {
  const management = createManagement();

  await reloadExtension(management, 'abc');

  assert.deepEqual(management.calls, [
    ['abc', false],
    ['abc', true],
  ]);
});

test('reloadExtension propaga erro de setEnabled', async () => {
  const management = createManagement({ failures: ['abc:true'] });

  await assert.rejects(
    () => reloadExtension(management, 'abc'),
    /falha em abc:true/,
  );
});

test('reloadAll recarrega na ordem e reporta progresso de cada item', async () => {
  const management = createManagement();
  const progress = [];

  const results = await reloadAll(management, ['a', 'b'], {
    onProgress: (event) => progress.push(event),
  });

  assert.deepEqual(management.calls, [
    ['a', false],
    ['a', true],
    ['b', false],
    ['b', true],
  ]);
  assert.deepEqual(results, [
    { id: 'a', ok: true },
    { id: 'b', ok: true },
  ]);
  assert.deepEqual(progress, [
    { completed: 1, total: 2, result: { id: 'a', ok: true } },
    { completed: 2, total: 2, result: { id: 'b', ok: true } },
  ]);
});

test('reloadAll continua após uma falha e registra o erro', async () => {
  const management = createManagement({ failures: ['a:true'] });

  const results = await reloadAll(management, ['a', 'b']);

  assert.deepEqual(results, [
    { id: 'a', ok: false, error: 'falha em a:true' },
    { id: 'b', ok: true },
  ]);
  assert.deepEqual(management.calls.slice(2), [
    ['b', false],
    ['b', true],
  ]);
});

test('reloadAll com lista vazia não chama a API nem o progresso', async () => {
  const management = createManagement();
  let progressCalls = 0;

  const results = await reloadAll(management, [], {
    onProgress: () => {
      progressCalls += 1;
    },
  });

  assert.deepEqual(results, []);
  assert.deepEqual(management.calls, []);
  assert.equal(progressCalls, 0);
});

test('reloadAll funciona sem callback de progresso', async () => {
  const management = createManagement();

  const results = await reloadAll(management, ['a']);

  assert.deepEqual(results, [{ id: 'a', ok: true }]);
});
