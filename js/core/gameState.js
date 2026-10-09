// Quản lý trạng thái một ván đấu: lượt đi, lịch sử (để Undo), kết quả.
// Không đụng tới DOM.

import { PLAYERS } from './constants.js';
import { applyMove, checkWinner, createEmptyBoard, getOpponent, isValidMove } from './board.js';

export class GameState {
  /** Mỗi phần tử là một bàn cờ; phần tử cuối là trạng thái hiện tại. */
  #history = [];
  #startingPlayer;

  constructor({ startingPlayer = PLAYERS.X } = {}) {
    this.reset(startingPlayer);
  }

  /** Bắt đầu ván mới (có thể đổi người đi trước). */
  reset(startingPlayer = this.#startingPlayer) {
    this.#startingPlayer = startingPlayer;
    this.#history = [createEmptyBoard()];
  }

  get #currentBoard() {
    return this.#history[this.#history.length - 1];
  }

  /** Trả về BẢN SAO bàn cờ để bên ngoài không sửa nhầm state thật. */
  get board() {
    return [...this.#currentBoard];
  }

  get startingPlayer() {
    return this.#startingPlayer;
  }

  get moveCount() {
    return this.#history.length - 1;
  }

  /** Lượt đi được suy ra từ số nước đã đánh → Undo tự động trả lại đúng lượt. */
  get currentPlayer() {
    return this.moveCount % 2 === 0 ? this.#startingPlayer : getOpponent(this.#startingPlayer);
  }

  get result() {
    return checkWinner(this.#currentBoard);
  }

  get isOver() {
    return this.result !== null;
  }

  get canUndo() {
    return this.moveCount > 0;
  }

  /**
   * Người chơi hiện tại đánh vào ô `index`.
   * @returns {boolean} true nếu nước đi được chấp nhận
   */
  makeMove(index) {
    if (this.isOver || !isValidMove(this.#currentBoard, index)) return false;
    this.#history.push(applyMove(this.#currentBoard, index, this.currentPlayer));
    return true;
  }

  /**
   * Lùi lại `steps` nước (chế độ đấu AI ở Bước 2 sẽ dùng steps = 2).
   * @returns {boolean} true nếu có lùi được ít nhất 1 nước
   */
  undo(steps = 1) {
    const n = Math.min(steps, this.moveCount);
    if (n <= 0) return false;
    this.#history.length -= n;
    return true;
  }

  /** Ảnh chụp trạng thái để View hiển thị. */
  snapshot() {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      result: this.result,
      moveCount: this.moveCount,
      canUndo: this.canUndo,
    };
  }
}
