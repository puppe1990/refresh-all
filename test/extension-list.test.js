import test from 'node:test';
import assert from 'node:assert/strict';

import { buildReloadList } from '../lib/extension-list.js';

function extension(overrides = {}) {
  return {
    id: 'id-padrao',
    name: 'Extensão',
    version: '1.0.0',
    type: 'extension',
    enabled: true,
    mayDisable: true,
    installType: 'normal',
    ...overrides,
  };
}

test('mantém apenas extensões habilitadas, desabilitáveis e do tipo extension', () => {
  const list = buildReloadList(
    [
      extension({ id: 'ok' }),
      extension({ id: 'desabilitada', enabled: false, mayEnable: true }),
      extension({ id: 'protegida-por-politica', mayDisable: false }),
      extension({ id: 'tema', type: 'theme' }),
      extension({ id: 'app', type: 'packaged_app' }),
      extension({ id: 'hosted-app', type: 'hosted_app' }),
    ],
    { selfId: 'self' },
  );

  assert.deepEqual(
    list.map((item) => item.id),
    ['ok'],
  );
});

test('não inclui a própria extensão', () => {
  const list = buildReloadList(
    [extension({ id: 'eu' }), extension({ id: 'outra' })],
    { selfId: 'eu' },
  );

  assert.deepEqual(
    list.map((item) => item.id),
    ['outra'],
  );
});

test('mapeia para id, nome, versão e flag de unpacked', () => {
  const list = buildReloadList(
    [
      extension({
        id: 'dev',
        name: 'Minha Extensão',
        version: '2.3.4',
        installType: 'development',
      }),
    ],
    { selfId: 'self' },
  );

  assert.deepEqual(list, [
    {
      id: 'dev',
      name: 'Minha Extensão',
      version: '2.3.4',
      unpacked: true,
    },
  ]);
});

test('ordena por nome ignorando maiúsculas e acentos', () => {
  const list = buildReloadList(
    [
      extension({ id: '1', name: 'Zebra' }),
      extension({ id: '2', name: 'abelha' }),
      extension({ id: '3', name: 'Ábaco' }),
    ],
    { selfId: 'self' },
  );

  assert.deepEqual(
    list.map((item) => item.name),
    ['Ábaco', 'abelha', 'Zebra'],
  );
});

test('devolve lista vazia quando nada é recarregável', () => {
  assert.deepEqual(buildReloadList([], { selfId: 'self' }), []);
});

test('devOnly mantém apenas extensões unpacked (installType development)', () => {
  const list = buildReloadList(
    [
      extension({ id: 'dev', name: 'Dev', installType: 'development' }),
      extension({ id: 'loja', name: 'Loja', installType: 'normal' }),
      extension({ id: 'sideload', name: 'Sideload', installType: 'sideload' }),
      extension({ id: 'admin', name: 'Admin', installType: 'admin' }),
    ],
    { selfId: 'self', devOnly: true },
  );

  assert.deepEqual(
    list.map((item) => item.id),
    ['dev'],
  );
});

test('devOnly combina com as demais exclusões (self, desabilitada, protegida)', () => {
  const list = buildReloadList(
    [
      extension({ id: 'ok-dev', installType: 'development' }),
      extension({ id: 'eu-dev', installType: 'development' }),
      extension({ id: 'dev-desabilitada', installType: 'development', enabled: false }),
      extension({ id: 'dev-protegida', installType: 'development', mayDisable: false }),
      extension({ id: 'loja', installType: 'normal' }),
    ],
    { selfId: 'eu-dev', devOnly: true },
  );

  assert.deepEqual(
    list.map((item) => item.id),
    ['ok-dev'],
  );
});
