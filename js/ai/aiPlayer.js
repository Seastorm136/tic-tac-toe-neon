// Lớp "tính cách" của AI: độ khó và gợi ý nước đi. Không phụ thuộc DOM.

import { getEmptyCells } from '../core/board.js';
import { getBestMove } from './minimax.js';

/** optimalRate = xác suất mỗi nước đi dùng Minimax; phần còn lại đánh ngẫu nhiên. */
export const DIFFICULTY = Object.freeze({
  easy:   Object.freeze({ label: 'Dễ',  optimalRate: 0.5 }),
  medium: Object.freeze({ label: 'Vừa', optimalRate: 0.8 }),
  hard:   Object.freeze({ label: 'Khó', optimalRate: 1.0 }),
});

function pickRandom(items, random) {
  return items[Math.floor(random() * items.length)];
}

/**
 * Chọn nước đi cho AI theo độ khó.
 * @param {Array} board
 * @param {'X'|'O'} aiPlayer
 * @param {keyof DIFFICULTY} level
 * @param {() => number} random hàm ngẫu nhiên trong [0, 1)
 * @returns {number | null}
 */
export function getAIMove(board, aiPlayer, level = 'hard', random = Math.random) {
  const config = DIFFICULTY[level];
  if (!config) throw new Error(`Độ khó không hợp lệ: ${level}`);

  const empty = getEmptyCells(board);
  if (empty.length === 0) return null;

  // Tung "đồng xu" riêng cho TỪNG nước đi.
  if (random() >= config.optimalRate) return pickRandom(empty, random);
  return getBestMove(board, aiPlayer, random);
}

/** Gợi ý nước đi tốt nhất cho người chơi, dùng chính Minimax. */
export function getHint(board, player, random = Math.random) {
  return getBestMove(board, player, random);
}
