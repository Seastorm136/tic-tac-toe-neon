import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryStorage, readJSON, writeJSON } from '../js/storage/storage.js';
import { createStatsStore, STATS_KEY } from '../js/storage/statsStore.js';
import { createPrefsStore, PREFS_KEY } from '../js/storage/prefsStore.js';

describe('statsStore', () => {
  test('bắt đầu từ 0', () => {
    const stats = createStatsStore(createMemoryStorage());
    assert.deepEqual(stats.getPve('hard'), { win: 0, loss: 0, draw: 0 });
    assert.deepEqual(stats.getPvp(), { X: 0, O: 0, draw: 0 });
  });

  test('ghi và đọc lại sau khi "mở lại game"', () => {
    const storage = createMemoryStorage();
    const a = createStatsStore(storage);
    a.recordPve('easy', 'win');
    a.recordPve('easy', 'win');
    a.recordPve('hard', 'draw');
    a.recordPvp('O');

    const b = createStatsStore(storage);
    assert.deepEqual(b.getPve('easy'), { win: 2, loss: 0, draw: 0 });
    assert.deepEqual(b.getPve('hard'), { win: 0, loss: 0, draw: 1 });
    assert.equal(b.getPvp().O, 1);
  });

  test('các độ khó được thống kê riêng', () => {
    const stats = createStatsStore(createMemoryStorage());
    stats.recordPve('medium', 'loss');
    assert.equal(stats.getPve('medium').loss, 1);
    assert.equal(stats.getPve('hard').loss, 0);
  });

  test('getPve trả về bản sao (sửa không ảnh hưởng dữ liệu)', () => {
    const stats = createStatsStore(createMemoryStorage());
    stats.getPve('hard').win = 99;
    assert.equal(stats.getPve('hard').win, 0);
  });

  test('reset xóa toàn bộ và lưu lại', () => {
    const storage = createMemoryStorage();
    const stats = createStatsStore(storage);
    stats.recordPvp('X');
    stats.reset();
    assert.equal(createStatsStore(storage).getPvp().X, 0);
  });

  test('JSON hỏng → bắt đầu lại từ 0, không crash', () => {
    const storage = createMemoryStorage();
    storage.setItem(STATS_KEY, '{không phải json');
    assert.deepEqual(createStatsStore(storage).getPvp(), { X: 0, O: 0, draw: 0 });
  });

  test('giá trị sai kiểu bị loại bỏ, giá trị đúng được giữ', () => {
    const storage = createMemoryStorage();
    writeJSON(storage, STATS_KEY, { pve: { hard: { win: -5, loss: 'abc', draw: 3 } }, pvp: { X: 2.5, O: 4 } });
    const stats = createStatsStore(storage);
    assert.deepEqual(stats.getPve('hard'), { win: 0, loss: 0, draw: 3 });
    assert.deepEqual(stats.getPvp(), { X: 0, O: 4, draw: 0 });
  });

  test('ghi kết quả không hợp lệ → ném lỗi', () => {
    const stats = createStatsStore(createMemoryStorage());
    assert.throws(() => stats.recordPve('impossible', 'win'));
    assert.throws(() => stats.recordPve('hard', 'victory'));
    assert.throws(() => stats.recordPvp('Z'));
  });
});

describe('prefsStore', () => {
  test('lưu từng phần, giữ phần cũ', () => {
    const prefs = createPrefsStore(createMemoryStorage());
    prefs.save({ mode: 'pvp' });
    prefs.save({ muted: true });
    assert.deepEqual(prefs.load(), { mode: 'pvp', muted: true });
  });

  test('dữ liệu không phải object → trả về {}', () => {
    const storage = createMemoryStorage();
    storage.setItem(PREFS_KEY, '[1,2,3]');
    assert.deepEqual(createPrefsStore(storage).load(), {});
  });
});

describe('storage helpers', () => {
  test('storage ném lỗi khi ghi (hết dung lượng) → bỏ qua, không crash', () => {
    const broken = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
    assert.doesNotThrow(() => writeJSON(broken, 'k', { a: 1 }));
    assert.doesNotThrow(() => createStatsStore(broken).recordPvp('X'));
  });

  test('readJSON trả fallback khi getItem ném lỗi', () => {
    const broken = { getItem: () => { throw new Error('SecurityError'); } };
    assert.equal(readJSON(broken, 'k', 'fallback'), 'fallback');
  });
});
