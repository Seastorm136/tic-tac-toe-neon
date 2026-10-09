// Hằng số dùng chung cho toàn bộ game. Không phụ thuộc DOM.

export const BOARD_SIZE = 9;

export const PLAYERS = Object.freeze({
  X: 'X',
  O: 'O',
});

export const DRAW = 'draw';

/**
 * Chỉ số các ô trên bàn cờ:
 *  0 | 1 | 2
 *  3 | 4 | 5
 *  6 | 7 | 8
 */
export const WIN_LINES = Object.freeze([
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // hàng ngang
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // hàng dọc
  [0, 4, 8], [2, 4, 6],            // đường chéo
]);

export const MODES = Object.freeze({
  PVP: 'pvp', // 2 người cùng máy
  PVE: 'pve', // đấu với AI (Bước 2)
});
