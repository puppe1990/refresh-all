import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSelection,
  collectSelected,
  restoreSelection,
  selectionSummary,
} from '../lib/selection.js';

test('createSelection começa vazia', () => {
  const selection = createSelection();

  assert.equal(selection.size, 0);
  assert.deepEqual(selection.ids(), []);
  assert.equal(selection.has('a'), false);
});

test('toggle liga e desliga o mesmo id', () => {
  const selection = createSelection();

  selection.toggle('a');
  assert.equal(selection.has('a'), true);
  assert.equal(selection.size, 1);

  selection.toggle('a');
  assert.equal(selection.has('a'), false);
  assert.equal(selection.size, 0);
});

test('selectAll seleciona todos os ids e clear limpa tudo', () => {
  const selection = createSelection();
  selection.toggle('b');

  selection.selectAll(['a', 'b', 'c']);
  assert.deepEqual(selection.ids(), ['a', 'b', 'c']);
  assert.equal(selection.size, 3);

  selection.clear();
  assert.equal(selection.size, 0);
});

test('collectSelected devolve as extensões na ordem da lista, não na ordem do clique', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const selection = createSelection();

  selection.toggle('c');
  selection.toggle('a');

  const selected = collectSelected(list, selection);
  assert.equal(selected.length, 2);
  assert.equal(selected[0], list[0]);
  assert.equal(selected[1], list[2]);
});

test('selectionSummary indica nenhuma, parcial ou todas', () => {
  const selection = createSelection();

  assert.deepEqual(selectionSummary(selection, 0), {
    count: 0,
    total: 0,
    all: false,
    some: false,
    none: true,
  });

  assert.deepEqual(selectionSummary(selection, 3), {
    count: 0,
    total: 3,
    all: false,
    some: false,
    none: true,
  });

  selection.toggle('a');
  assert.deepEqual(selectionSummary(selection, 3), {
    count: 1,
    total: 3,
    all: false,
    some: true,
    none: false,
  });

  selection.selectAll(['a', 'b', 'c']);
  assert.deepEqual(selectionSummary(selection, 3), {
    count: 3,
    total: 3,
    all: true,
    some: false,
    none: false,
  });
});

test('restoreSelection restaura apenas ids ainda disponíveis, na ordem da lista', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const selection = createSelection();

  const restored = restoreSelection(selection, ['c', 'zumbi', 'a'], list);

  assert.deepEqual(restored, ['a', 'c']);
  assert.deepEqual(selection.ids(), ['a', 'c']);
});

test('restoreSelection substitui a seleção atual e devolve vazio quando nada casa', () => {
  const list = [{ id: 'a' }];
  const selection = createSelection();
  selection.toggle('a');

  assert.deepEqual(restoreSelection(selection, ['zumbi'], list), []);
  assert.equal(selection.size, 0);

  assert.deepEqual(restoreSelection(selection, [], list), []);
  assert.equal(selection.size, 0);
});

test('restoreSelection remove duplicatas do que foi salvo', () => {
  const selection = createSelection();

  assert.deepEqual(restoreSelection(selection, ['a', 'a'], [{ id: 'a' }]), ['a']);
  assert.equal(selection.size, 1);
});
