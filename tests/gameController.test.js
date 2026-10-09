import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { MODES, PLAYERS } from '../js/core/constants.js';
import { GameState } from '../js/core/gameState.js';
import { GameController, sanitizeSettings } from '../js/controller/gameController.js';
import { createStatsStore } from '../js/storage/statsStore.js';
import { createPrefsStore } from '../js/storage/prefsStore.js';
import { createMemoryStorage } from '../js/storage/storage.js';

const { X, O } = PLAYERS;
const AI_DELAY = 400;

/** View giả: ghi lại các lần render/announce, không cần DOM. */
function createFakeView() {
  return {
    last: null,
    events: [],
    settings: null,
    muted: null,
    render(vm) { this.last = vm; },
    announce(event) { this.events.push(event); },
    setSettings(s) { this.settings = { ...s }; },
    setMuted(m) { this.muted = m; },
    onCellClick() {}, onUndo() {}, onReset() {}, onHint() {},
    onSettingsChange() {}, onToggleMute() {}, onResetStats() {},
  };
}

/** Tạo controller với timer giả (t.mock.timers tự reset sau mỗi test). */
function setup(t, settings = {}, storage = createMemoryStorage()) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const prefs = createPrefsStore(storage);
  prefs.save({ mode: MODES.PVE, difficulty: 'hard', humanPlayer: X, ...settings });
  const stats = createStatsStore(storage);
  const view = createFakeView();
  const controller = new GameController(new GameState(), view, { aiDelayMs: AI_DELAY, stats, prefs });
  controller.init();

  const tick = () => t.mock.timers.tick(AI_DELAY);
  const pieces = () => view.last.board.filter(Boolean).length;
  const firstEmpty = () => view.last.board.findIndex((c) => c === null);
  const eventsOf = (type) => view.events.filter((e) => e.type === type);
  return { controller, view, stats, prefs, storage, tick, pieces, firstEmpty, eventsOf };
}

/** Ván 2 người: X thắng hàng ngang trên cùng. */
const playXWinsTopRow = (controller) => [0, 3, 1, 4, 2].forEach((i) => controller.handleCellClick(i));

describe('GameController – đấu AI', () => {
  test('sau nước của người, AI "suy nghĩ" rồi mới đánh', (t) => {
    const { controller, view, tick, pieces } = setup(t);
    controller.handleCellClick(4);

    assert.equal(view.last.isThinking, true);
    assert.equal(view.last.canInteract, false);
    assert.equal(pieces(), 1);

    tick();
    assert.equal(view.last.isThinking, false);
    assert.equal(view.last.canInteract, true);
    assert.equal(pieces(), 2);
    assert.equal(view.last.currentPlayer, X);
  });

  test('click trong lúc AI đang suy nghĩ bị bỏ qua', (t) => {
    const { controller, tick, pieces } = setup(t);
    controller.handleCellClick(0);
    controller.handleCellClick(1); // phải bị chặn
    assert.equal(pieces(), 1);
    tick();
    assert.equal(pieces(), 2);
  });

  test('người chơi chọn O (đi sau) → AI tự đánh trước', (t) => {
    const { view, tick, pieces } = setup(t, { humanPlayer: O });
    assert.equal(view.last.isThinking, true);
    tick();
    assert.equal(pieces(), 1);
    assert.equal(view.last.currentPlayer, O);
    assert.equal(view.last.canUndo, false, 'chưa có nước nào của người để undo');
  });

  test('Undo lùi 2 nước (nước của AI + nước của người)', (t) => {
    const { controller, view, tick, pieces, firstEmpty } = setup(t);
    controller.handleCellClick(4); tick();
    controller.handleCellClick(firstEmpty()); tick();
    assert.equal(pieces(), 4);

    controller.handleUndo();
    assert.equal(pieces(), 2);
    assert.equal(view.last.currentPlayer, X);
    assert.equal(view.last.board[4], X, 'nước đầu tiên vẫn còn');
  });

  test('Undo trong lúc AI suy nghĩ → hủy lượt AI, chỉ lùi nước của người', (t) => {
    const { controller, view, tick, pieces } = setup(t);
    controller.handleCellClick(4);
    controller.handleUndo();
    assert.equal(pieces(), 0);
    assert.equal(view.last.isThinking, false);

    tick(); // timer cũ đã bị hủy → AI không được đánh nữa
    assert.equal(pieces(), 0);
  });

  test('Undo khi người chơi đi sau: lùi về đúng lượt O', (t) => {
    const { controller, view, tick, pieces, firstEmpty } = setup(t, { humanPlayer: O });
    tick();                                         // AI: X
    controller.handleCellClick(firstEmpty()); tick(); // O, rồi AI: X
    assert.equal(pieces(), 3);
    controller.handleUndo();
    assert.equal(pieces(), 1);
    assert.equal(view.last.currentPlayer, O);
  });

  test('Gợi ý: hiện ô tốt nhất và tự xóa sau khi đánh', (t) => {
    const { controller, view, tick, eventsOf } = setup(t);
    controller.handleCellClick(0); tick();
    controller.handleHint();
    const hint = view.last.hintIndex;
    assert.ok(Number.isInteger(hint) && view.last.board[hint] === null);
    assert.equal(eventsOf('hint').length, 1);

    controller.handleCellClick(hint);
    assert.equal(view.last.hintIndex, null);
  });

  test('Không thể dùng gợi ý khi AI đang suy nghĩ', (t) => {
    const { controller, view } = setup(t);
    controller.handleCellClick(4);
    controller.handleHint();
    assert.equal(view.last.hintIndex, null);
  });

  test('Đổi cài đặt → bắt đầu ván mới và được lưu lại', (t) => {
    const { controller, view, tick, pieces, prefs } = setup(t);
    controller.handleCellClick(4); tick();
    controller.handleSettingsChange({ difficulty: 'easy' });
    assert.equal(pieces(), 0);
    assert.equal(view.last.difficulty, 'easy');
    assert.equal(view.last.difficultyLabel, 'Dễ');
    assert.equal(prefs.load().difficulty, 'easy');
  });

  test('Thua AI Khó → ghi 1 trận thua, phát sự kiện "end" với outcome "loss"', (t) => {
    const { controller, view, tick, firstEmpty, stats, eventsOf } = setup(t);
    // Người chơi "dở": luôn đánh vào ô trống đầu tiên
    while (view.last.result === null) {
      controller.handleCellClick(firstEmpty());
      tick();
    }
    const record = stats.getPve('hard');
    assert.equal(record.win, 0, 'không thể thắng AI Khó');
    assert.equal(record.loss + record.draw, 1);
    assert.deepEqual(view.last.stats, record);

    const [end] = eventsOf('end');
    assert.equal(end.outcome, record.loss ? 'loss' : 'draw');
  });
});

describe('GameController – 2 người', () => {
  test('không có AI, Undo lùi 1 nước', (t) => {
    const { controller, view, pieces } = setup(t, { mode: MODES.PVP });
    controller.handleCellClick(0);
    assert.equal(view.last.isThinking, false);
    assert.equal(view.last.currentPlayer, O);

    controller.handleCellClick(1);
    controller.handleUndo();
    assert.equal(pieces(), 1);
    assert.equal(view.last.currentPlayer, O);
  });

  test('X thắng → thống kê X +1, sự kiện move & end đúng thứ tự', (t) => {
    const { controller, view, stats, eventsOf } = setup(t, { mode: MODES.PVP });
    playXWinsTopRow(controller);

    assert.equal(stats.getPvp().X, 1);
    assert.equal(view.last.stats.X, 1);
    assert.equal(eventsOf('move').length, 5);
    assert.deepEqual(view.events.at(-1), { type: 'end', winner: X, outcome: 'win' });
    assert.deepEqual(view.events.at(-2), { type: 'move', player: X, index: 2 });
  });

  test('Undo sau khi thắng rồi thắng lại → thống kê KHÔNG bị đếm 2 lần', (t) => {
    const { controller, stats } = setup(t, { mode: MODES.PVP });
    playXWinsTopRow(controller);
    controller.handleUndo();
    controller.handleCellClick(2);
    assert.equal(stats.getPvp().X, 1);

    controller.handleReset(); // ván mới → lại được ghi
    playXWinsTopRow(controller);
    assert.equal(stats.getPvp().X, 2);
  });

  test('Xóa thống kê', (t) => {
    const { controller, view } = setup(t, { mode: MODES.PVP });
    playXWinsTopRow(controller);
    controller.handleResetStats();
    assert.deepEqual(view.last.stats, { X: 0, O: 0, draw: 0 });
  });
});

describe('GameController – cài đặt & lưu trữ', () => {
  test('init nạp cài đặt đã lưu và đẩy sang View', (t) => {
    const { view } = setup(t, { mode: MODES.PVP, difficulty: 'medium', humanPlayer: O, muted: true });
    assert.deepEqual(view.settings, { mode: MODES.PVP, difficulty: 'medium', humanPlayer: O, muted: true });
    assert.equal(view.muted, true);
  });

  test('cài đặt hỏng trong localStorage bị bỏ qua, dùng mặc định', (t) => {
    const { view } = setup(t, { mode: 'online', difficulty: 'god', humanPlayer: 'Z', muted: 'yes' });
    assert.equal(view.last.mode, MODES.PVE);
    assert.equal(view.last.difficulty, 'hard');
    assert.equal(view.last.humanPlayer, X);
    assert.equal(view.muted, false);
  });

  test('bật/tắt tiếng được lưu lại', (t) => {
    const { controller, view, prefs } = setup(t);
    controller.handleToggleMute();
    assert.equal(view.muted, true);
    assert.equal(prefs.load().muted, true);
  });

  test('thống kê còn nguyên khi mở lại game (cùng storage)', (t) => {
    const storage = createMemoryStorage();
    const first = setup(t, { mode: MODES.PVP }, storage);
    playXWinsTopRow(first.controller);

    t.mock.timers.reset();
    const second = setup(t, { mode: MODES.PVP }, storage);
    assert.equal(second.view.last.stats.X, 1);
  });

  test('sanitizeSettings chỉ giữ giá trị hợp lệ', () => {
    assert.deepEqual(sanitizeSettings({ mode: 'pvp', difficulty: 'x', humanPlayer: 'O', muted: 1 }), {
      mode: 'pvp',
      humanPlayer: 'O',
    });
  });
});
