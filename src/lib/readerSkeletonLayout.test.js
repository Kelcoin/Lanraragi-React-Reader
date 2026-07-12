import assert from 'node:assert/strict';
import test from 'node:test';

import { getReaderSkeletonToolbarGroups } from './readerSkeletonLayout.js';

test('desktop reader skeleton reserves the real toolbar button footprint', () => {
  const groups = getReaderSkeletonToolbarGroups(false);

  assert.deepEqual(groups.left, ['← 返回', '阅读历史', '待看归档']);
  assert.deepEqual(groups.right, ['沉浸模式', '设为封面', '阅读设定', '编辑元数据', '缩略面板']);
});

test('mobile reader skeleton keeps icon buttons uniform', () => {
  const groups = getReaderSkeletonToolbarGroups(true);

  assert.equal(groups.left.length, 3);
  assert.equal(groups.right.length, 5);
});
