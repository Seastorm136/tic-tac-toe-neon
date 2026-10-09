import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { DRAW, PLAYERS } from '../js/core/constants.js';
import { GameState } from '../js/core/gameState.js';

/** Đánh lần lượt các nước trong danh sách. */
const play = (game, moves) => moves.forEach((i) => assert.equal(game.makeMove(i), true, `nước ${i}`));

describe('GameState – lượt đi', () => {
  test('X đi trước mặc định, sau đó luân phiên', () => {
    const game = new GameState();
    assert.equal(game.currentPlayer, PLAYERS.X);
    game.makeMove(0);
    assert.equal(game.currentPlayer, PLAYERS.O);
    game.makeMove(1);
    assert.equal(game.currentPlayer, PLAYERS.X);
  });

  test('có thể cho O đi trước', () => {
    const game = new GameState({ startingPlayer: PLAYERS.O });
    game.makeMove(4);
    assert.equal(game.board[4], PLAYERS.O);
    assert.equal(game.currentPlayer, PLAYERS.X);
  });

  test('từ chối nước đi vào ô đã có quân và không đổi lượt', () => {
    const game = new GameState();
    game.makeMove(0);
    assert.equal(game.makeMove(0), false);
    assert.equal(game.currentPlayer, PLAYERS.O);
    assert.equal(game.moveCount, 1);
  });
});

describe('GameState – kết thúc ván', () => {
  test('phát hiện X thắng và chặn mọi nước đi sau đó', () => {
    const game = new GameState();
    play(game, [0, 3, 1, 4, 2]); // X: 0,1,2
    assert.deepEqual(game.result, { winner: PLAYERS.X, line: [0, 1, 2] });
    assert.equal(game.isOver, true);
    assert.equal(game.makeMove(8), false);
  });

  test('phát hiện hòa', () => {
    const game = new GameState();
    // X O X
    // X O O
    // O X X
    play(game, [0, 1, 2, 4, 3, 5, 7, 6, 8]);
    assert.equal(game.result.winner, DRAW);
  });
});

describe('GameState – Undo & Reset', () => {
  test('undo xóa nước cuối và trả lại đúng lượt', () => {
    const game = new GameState();
    play(game, [0, 4]);
    assert.equal(game.undo(), true);
    assert.equal(game.board[4], null);
    assert.equal(game.currentPlayer, PLAYERS.O);
  });

  test('undo nhiều bước (dùng cho chế độ AI)', () => {
    const game = new GameState();
    play(game, [0, 4, 8]);
    game.undo(2);
    assert.equal(game.moveCount, 1);
    assert.equal(game.currentPlayer, PLAYERS.O);
  });

  test('undo sau khi thắng sẽ mở lại ván', () => {
    const game = new GameState();
    play(game, [0, 3, 1, 4, 2]);
    game.undo();
    assert.equal(game.isOver, false);
    assert.equal(game.currentPlayer, PLAYERS.X);
  });

  test('undo khi chưa có nước nào → false, không lỗi', () => {
    const game = new GameState();
    assert.equal(game.canUndo, false);
    assert.equal(game.undo(), false);
    assert.equal(game.undo(5), false);
  });

  test('undo quá số nước đã đánh chỉ lùi về bàn cờ rỗng', () => {
    const game = new GameState();
    play(game, [0]);
    assert.equal(game.undo(5), true);
    assert.equal(game.moveCount, 0);
  });

  test('reset đưa về bàn cờ rỗng', () => {
    const game = new GameState();
    play(game, [0, 1, 2]);
    game.reset();
    assert.equal(game.moveCount, 0);
    assert.ok(game.board.every((c) => c === null));
  });
});

describe('GameState – đóng gói dữ liệu', () => {
  test('sửa mảng board lấy ra không ảnh hưởng state thật', () => {
    const game = new GameState();
    const copy = game.board;
    copy[0] = PLAYERS.O;
    assert.equal(game.board[0], null);
  });
});
