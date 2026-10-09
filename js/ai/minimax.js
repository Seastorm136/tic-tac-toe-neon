// Thuật toán Minimax cho Tic-Tac-Toe. Không phụ thuộc DOM.
//
// Quy ước điểm (nhìn từ phía AI):
//   AI thắng → +10 - depth  (thắng càng sớm càng tốt)
//   Hòa      →   0
//   AI thua  → -10 + depth  (thua càng muộn càng tốt)

import { DRAW } from '../core/constants.js';
import { checkWinner, getEmptyCells, getOpponent } from '../core/board.js';

export const WIN_SCORE = 10;

/** Chấm điểm một trạng thái đã kết thúc. */
export function evaluate(result, depth, aiPlayer) {
  if (result.winner === aiPlayer) return WIN_SCORE - depth;
  if (result.winner === DRAW) return 0;
  return depth - WIN_SCORE;
}

// ── Ghi nhớ kết quả (memoization) ──
// Tic-Tac-Toe chỉ có khoảng 5.500 thế cờ khác nhau, nhưng cây tìm kiếm có ~550.000 nút
// vì cùng một thế cờ xuất hiện qua nhiều thứ tự đánh khác nhau. Lưu lại điểm của các
// thế cờ đã tính giúp những lần gọi sau gần như tức thì.
// Điểm của một nút chỉ phụ thuộc vào (bàn cờ, depth, lượt ai, AI là X hay O), nên đó chính là key.
const cache = new Map();

function cacheKey(board, depth, isMaximizing, aiPlayer) {
  let key = '';
  for (const cell of board) key += cell ?? '-';
  return `${key}|${depth}|${isMaximizing ? 'max' : 'min'}|${aiPlayer}`;
}

/**
 * Đệ quy Minimax.
 * Lưu ý: hàm tạm thời sửa `board` khi thử nước đi rồi hoàn tác ngay,
 * nên luôn truyền vào một BẢN SAO (getBestMoves đã làm việc này).
 *
 * @param {Array} board         bàn cờ hiện tại
 * @param {number} depth        số nước đã thử tính từ gốc
 * @param {boolean} isMaximizing true nếu đang tới lượt AI
 * @param {'X'|'O'} aiPlayer    quân của bên đang được tối ưu
 * @returns {number} điểm tốt nhất có thể đạt được
 */
export function minimax(board, depth, isMaximizing, aiPlayer) {
  const result = checkWinner(board);
  if (result) return evaluate(result, depth, aiPlayer); // điều kiện dừng

  const key = cacheKey(board, depth, isMaximizing, aiPlayer);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const mover = isMaximizing ? aiPlayer : getOpponent(aiPlayer);
  let best = isMaximizing ? -Infinity : Infinity;

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;
    board[i] = mover;                                         // thử đánh
    const score = minimax(board, depth + 1, !isMaximizing, aiPlayer);
    board[i] = null;                                          // hoàn tác (backtrack)
    best = isMaximizing ? Math.max(best, score) : Math.min(best, score);
  }

  cache.set(key, best);
  return best;
}

/**
 * Tất cả các nước đi có điểm cao nhất cho `player`.
 * @returns {{ moves: number[], score: number }}
 */
export function getBestMoves(board, player) {
  const work = [...board]; // không bao giờ sửa bàn cờ của người gọi
  let bestScore = -Infinity;
  let moves = [];

  for (const i of getEmptyCells(work)) {
    work[i] = player;
    const score = minimax(work, 0, false, player);
    work[i] = null;

    if (score > bestScore) {
      bestScore = score;
      moves = [i];
    } else if (score === bestScore) {
      moves.push(i);
    }
  }
  return { moves, score: bestScore };
}

/**
 * Nước đi tối ưu cho `player`. Nếu có nhiều nước tốt ngang nhau thì chọn ngẫu nhiên
 * một nước, để AI không lặp lại y hệt nhau mỗi ván.
 * @param {() => number} random hàm ngẫu nhiên trong [0, 1) (truyền vào để test được)
 * @returns {number | null} chỉ số ô, hoặc null nếu hết ô trống
 */
export function getBestMove(board, player, random = Math.random) {
  const { moves } = getBestMoves(board, player);
  if (moves.length === 0) return null;
  return moves[Math.floor(random() * moves.length)];
}
