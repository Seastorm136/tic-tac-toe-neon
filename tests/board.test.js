import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { DRAW, PLAYERS, WIN_LINES } from '../js/core/constants.js';
import {
  applyMove,
  checkWinner,
  createEmptyBoard,
  getEmptyCells,
  getOpponent,
  isValidMove,
} from '../js/core/board.js';

/** Tạo bàn cờ từ chuỗi 9 ký tự, '.' là ô trống. Ví dụ: 'XXO.O....' */
const b = (s) => [...s].map((c) => (c === '.' ? null : c));

describe('checkWinner', () => {
  for (const player of [PLAYERS.X, PLAYERS.O]) {
    for (const line of WIN_LINES) {
      test(`${player} thắng trên đường [${line}]`, () => {
        const board = createEmptyBoard();
        line.forEach((i) => (board[i] = player));
        assert.deepEqual(checkWinner(board), { winner: player, line });
      });
    }
  }

  test('bàn cờ rỗng → chưa kết thúc', () => {
    assert.equal(checkWinner(createEmptyBoard()), null);
  });

  test('ván đang dở → chưa kết thúc', () => {
    assert.equal(checkWinner(b('XO.X.O...')), null);
  });

  test('bàn cờ đầy, không ai thắng → hòa', () => {
    assert.deepEqual(checkWinner(b('XOXXOOOXX')), { winner: DRAW, line: null });
  });

  test('thắng ở nước cuối cùng (bàn cờ đầy) → tính là thắng, không phải hòa', () => {
    assert.equal(checkWinner(b('XOXOXOOXX')).winner, PLAYERS.X);
  });
});

describe('isValidMove', () => {
  test('ô trống hợp lệ, ô đã đánh không hợp lệ', () => {
    const board = b('X........');
    assert.equal(isValidMove(board, 1), true);
    assert.equal(isValidMove(board, 0), false);
  });

  test('index ngoài phạm vi hoặc không phải số nguyên', () => {
    const board = createEmptyBoard();
    for (const index of [-1, 9, 1.5, NaN, '3', undefined]) {
      assert.equal(isValidMove(board, index), false, `index = ${index}`);
    }
  });
});

describe('applyMove', () => {
  test('trả về bàn cờ mới và không sửa bàn cờ cũ', () => {
    const board = createEmptyBoard();
    const next = applyMove(board, 4, PLAYERS.X);
    assert.equal(next[4], PLAYERS.X);
    assert.equal(board[4], null);
    assert.notEqual(next, board);
  });

  test('ném lỗi khi đánh vào ô đã có quân', () => {
    assert.throws(() => applyMove(b('X........'), 0, PLAYERS.O));
  });
});

describe('tiện ích', () => {
  test('getEmptyCells', () => {
    assert.deepEqual(getEmptyCells(b('X.O.X.O.X')), [1, 3, 5, 7]);
  });

  test('getOpponent', () => {
    assert.equal(getOpponent(PLAYERS.X), PLAYERS.O);
    assert.equal(getOpponent(PLAYERS.O), PLAYERS.X);
  });
});
