import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { DRAW, PLAYERS } from '../js/core/constants.js';
import { applyMove, checkWinner, createEmptyBoard, getEmptyCells, getOpponent } from '../js/core/board.js';
import { evaluate, getBestMove, getBestMoves, minimax } from '../js/ai/minimax.js';
import { DIFFICULTY, getAIMove, getHint } from '../js/ai/aiPlayer.js';

const { X, O } = PLAYERS;
const b = (s) => [...s].map((c) => (c === '.' ? null : c));

/** Bộ sinh số ngẫu nhiên có seed → test tái lập được (mulberry32). */
function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Cho 2 "người chơi" (hàm chọn nước) đấu 1 ván, X đi trước.
 * @returns {'X' | 'O' | 'draw'}
 */
function playGame(chooseX, chooseO) {
  let board = createEmptyBoard();
  let turn = X;
  while (!checkWinner(board)) {
    const move = (turn === X ? chooseX : chooseO)(board, turn);
    board = applyMove(board, move, turn);
    turn = getOpponent(turn);
  }
  return checkWinner(board).winner;
}

describe('evaluate', () => {
  test('AI thắng → dương, thua → âm, hòa → 0; thắng sớm được điểm cao hơn', () => {
    assert.equal(evaluate({ winner: X }, 0, X), 10);
    assert.equal(evaluate({ winner: X }, 3, X), 7);
    assert.equal(evaluate({ winner: O }, 3, X), -7);
    assert.equal(evaluate({ winner: DRAW }, 5, X), 0);
  });
});

describe('Minimax – các bài test bắt buộc', () => {
  test('1. AI THẮNG NGAY khi có thể (ưu tiên thắng hơn chặn)', () => {
    // X X .      X đi: thắng ở ô 2, thay vì chặn O ở ô 5
    // O O .
    // . . .
    const board = b('XX.OO....');
    assert.deepEqual(getBestMoves(board, X).moves, [2]);
  });

  test('2. AI CHẶN khi người chơi sắp thắng', () => {
    // X X .      O đi: bắt buộc chặn ở ô 2
    // . O .
    // . . .
    assert.deepEqual(getBestMoves(b('XX..O....'), O).moves, [2]);
    // Chặn đường chéo
    assert.deepEqual(getBestMoves(b('X.O.X....'), O).moves, [8]);
  });

  test('3. AI Khó đấu AI Khó → luôn hòa', () => {
    const random = seededRandom(42);
    const hard = (board, player) => getAIMove(board, player, 'hard', random);
    for (let i = 0; i < 50; i++) {
      assert.equal(playGame(hard, hard), DRAW, `ván ${i + 1}`);
    }
  });

  test('4. AI Khó đấu bot ngẫu nhiên 1000 ván → không thua ván nào', () => {
    const random = seededRandom(2026);
    const hard = (board, player) => getAIMove(board, player, 'hard', random);
    const randomBot = (board) => {
      const empty = getEmptyCells(board);
      return empty[Math.floor(random() * empty.length)];
    };

    const stats = { win: 0, draw: 0, loss: 0 };
    for (let i = 0; i < 1000; i++) {
      const aiIsX = i % 2 === 0; // 500 ván AI đi trước, 500 ván AI đi sau
      const aiPlayer = aiIsX ? X : O;
      const winner = aiIsX ? playGame(hard, randomBot) : playGame(randomBot, hard);
      if (winner === aiPlayer) stats.win++;
      else if (winner === DRAW) stats.draw++;
      else stats.loss++;
    }

    assert.equal(stats.loss, 0, `Thống kê: ${JSON.stringify(stats)}`);
    assert.ok(stats.win > 700, `AI nên thắng phần lớn số ván: ${JSON.stringify(stats)}`);
  });
});

describe('Minimax – tính chất khác', () => {
  test('bàn cờ rỗng có giá trị 0 (chơi tối ưu thì hòa)', () => {
    assert.equal(getBestMoves(createEmptyBoard(), X).score, 0);
  });

  test('không sửa bàn cờ của người gọi', () => {
    const board = b('X...O....');
    const before = [...board];
    getBestMove(board, X);
    minimax([...board], 0, true, X);
    assert.deepEqual(board, before);
  });

  test('chọn ngẫu nhiên giữa các nước tốt ngang nhau', () => {
    // Bàn rỗng: mọi nước đều hòa (điểm 0) → cả 9 ô là "tốt nhất"
    const { moves } = getBestMoves(createEmptyBoard(), X);
    assert.equal(moves.length, 9);
    assert.equal(getBestMove(createEmptyBoard(), X, () => 0), moves[0]);
    assert.equal(getBestMove(createEmptyBoard(), X, () => 0.999), moves[8]);
  });

  test('hết ô trống → null', () => {
    assert.equal(getBestMove(b('XOXXOOOXX'), X), null);
  });

  test('nước đi đầu tiên đủ nhanh', () => {
    const start = performance.now();
    getBestMove(createEmptyBoard(), X);
    assert.ok(performance.now() - start < 1000);
  });
});

describe('Độ khó & gợi ý', () => {
  // X X .   Nước tối ưu của X là ô 2 (thắng ngay). Ô trống cuối cùng là ô 8.
  // O O .
  // . . .
  const board = b('XX.OO....');

  test('Khó: luôn đánh tối ưu, bỏ qua kết quả tung đồng xu', () => {
    assert.equal(getAIMove(board, X, 'hard', () => 0.999), 2);
  });

  test('Dễ: tung < 0.5 → tối ưu, ≥ 0.5 → ngẫu nhiên', () => {
    assert.equal(getAIMove(board, X, 'easy', () => 0.1), 2);
    assert.equal(getAIMove(board, X, 'easy', () => 0.999), 8); // phần tử cuối của ô trống
  });

  test('Vừa: ngưỡng 0.8', () => {
    assert.equal(DIFFICULTY.medium.optimalRate, 0.8);
    assert.equal(getAIMove(board, X, 'medium', () => 0.79), 2);
    assert.equal(getAIMove(board, X, 'medium', () => 0.81), 8);
  });

  test('Dễ thực sự có thua khi gặp người chơi giỏi', () => {
    const random = seededRandom(7);
    const easy = (bd, p) => getAIMove(bd, p, 'easy', random);
    const hard = (bd, p) => getAIMove(bd, p, 'hard', random);
    let easyLosses = 0;
    for (let i = 0; i < 100; i++) if (playGame(hard, easy) === X) easyLosses++;
    assert.ok(easyLosses > 10, `Easy thua ${easyLosses}/100 ván`);
  });

  test('độ khó không hợp lệ → ném lỗi', () => {
    assert.throws(() => getAIMove(board, X, 'insane'));
  });

  test('hết ô trống → null', () => {
    assert.equal(getAIMove(b('XOXXOOOXX'), X, 'easy'), null);
  });

  test('getHint gợi ý nước chặn cho người chơi', () => {
    // Người chơi là X, O đang dọa thắng ở ô 8
    assert.equal(getHint(b('O.X.O.X..'), X), 8);
  });
});
