// Các hàm thuần (pure functions) xử lý bàn cờ.
// Không thay đổi mảng đầu vào, không đụng tới DOM → dễ test và dùng lại cho AI.

import { BOARD_SIZE, DRAW, PLAYERS, WIN_LINES } from './constants.js';

/** Tạo bàn cờ rỗng: mảng 9 phần tử null. */
export function createEmptyBoard() {
  return Array(BOARD_SIZE).fill(null);
}

/** Trả về người chơi còn lại. */
export function getOpponent(player) {
  return player === PLAYERS.X ? PLAYERS.O : PLAYERS.X;
}

/** Nước đi hợp lệ khi index nằm trong bàn cờ và ô đó còn trống. */
export function isValidMove(board, index) {
  return Number.isInteger(index) && index >= 0 && index < BOARD_SIZE && board[index] === null;
}

/** Danh sách chỉ số các ô còn trống. */
export function getEmptyCells(board) {
  const cells = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) cells.push(i);
  }
  return cells;
}

/**
 * Đặt quân và trả về một bàn cờ MỚI (bàn cờ cũ giữ nguyên).
 * @throws {Error} nếu nước đi không hợp lệ
 */
export function applyMove(board, index, player) {
  if (!isValidMove(board, index)) {
    throw new Error(`Nước đi không hợp lệ: ${index}`);
  }
  const next = [...board];
  next[index] = player;
  return next;
}

/**
 * Kiểm tra kết quả ván đấu.
 * @returns {{ winner: 'X' | 'O' | 'draw', line: number[] | null } | null}
 *          null nếu ván chưa kết thúc.
 */
export function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: DRAW, line: null };
  }
  return null;
}
