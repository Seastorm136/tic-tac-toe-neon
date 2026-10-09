// Controller: nhận sự kiện từ View, cập nhật Model, gọi AI, ghi thống kê,
// rồi yêu cầu View vẽ lại và phát hiệu ứng.
// Đây là nơi duy nhất biết cả Model, AI, Storage lẫn View.

import { DRAW, MODES, PLAYERS } from '../core/constants.js';
import { getOpponent } from '../core/board.js';
import { DIFFICULTY, getAIMove, getHint } from '../ai/aiPlayer.js';
import { createStatsStore } from '../storage/statsStore.js';
import { createPrefsStore } from '../storage/prefsStore.js';

export const DEFAULT_SETTINGS = Object.freeze({
  mode: MODES.PVE,
  difficulty: 'hard',
  humanPlayer: PLAYERS.X, // X luôn đi trước → chọn X = đi trước, O = đi sau
  muted: false,
});

/** Chỉ giữ lại các cài đặt hợp lệ (dữ liệu từ localStorage có thể bị sửa tay/hỏng). */
export function sanitizeSettings(raw = {}) {
  const settings = {};
  if (Object.values(MODES).includes(raw.mode)) settings.mode = raw.mode;
  if (Object.hasOwn(DIFFICULTY, raw.difficulty)) settings.difficulty = raw.difficulty;
  if (raw.humanPlayer === PLAYERS.X || raw.humanPlayer === PLAYERS.O) settings.humanPlayer = raw.humanPlayer;
  if (typeof raw.muted === 'boolean') settings.muted = raw.muted;
  return settings;
}

/**
 * Giao diện View mà Controller cần:
 *   render(vm), announce(event), setSettings(s), setMuted(b),
 *   onCellClick, onUndo, onReset, onHint, onSettingsChange, onToggleMute, onResetStats
 *
 * Các event gửi qua announce():
 *   { type: 'move', player, index } | { type: 'end', winner, outcome } | { type: 'hint' } | { type: 'undo' }
 *   outcome: 'win' | 'loss' | 'draw' — nhìn từ phía người chơi (chế độ 2 người: có người thắng = 'win')
 */
export class GameController {
  #state;
  #view;
  #stats;
  #prefs;
  #settings = { ...DEFAULT_SETTINGS };
  #aiDelayMs;
  #aiTimer = null;        // khác null nghĩa là AI đang "suy nghĩ" → khóa input
  #hintIndex = null;
  #resultRecorded = false; // mỗi ván chỉ ghi thống kê 1 lần (chống Undo để "gỡ" kết quả)
  #pendingEvents = [];

  /**
   * @param {import('../core/gameState.js').GameState} state
   * @param {object} view
   * @param {{ aiDelayMs?: number, stats?: object, prefs?: object }} [options]
   */
  constructor(state, view, { aiDelayMs = 450, stats = createStatsStore(), prefs = createPrefsStore() } = {}) {
    this.#state = state;
    this.#view = view;
    this.#aiDelayMs = aiDelayMs;
    this.#stats = stats;
    this.#prefs = prefs;
  }

  init() {
    const view = this.#view;
    view.onCellClick((index) => this.handleCellClick(index));
    view.onUndo(() => this.handleUndo());
    view.onReset(() => this.handleReset());
    view.onHint(() => this.handleHint());
    view.onSettingsChange((settings) => this.handleSettingsChange(settings));
    view.onToggleMute(() => this.handleToggleMute());
    view.onResetStats(() => this.handleResetStats());

    this.#settings = { ...DEFAULT_SETTINGS, ...sanitizeSettings(this.#prefs.load()) };
    view.setSettings(this.#settings);
    view.setMuted(this.#settings.muted);
    this.handleReset();
  }

  // ── Trạng thái suy ra ──

  get #isVsAI() {
    return this.#settings.mode === MODES.PVE;
  }

  get #aiPlayer() {
    return getOpponent(this.#settings.humanPlayer);
  }

  get #isThinking() {
    return this.#aiTimer !== null;
  }

  /** Người dùng có được thao tác trên bàn cờ lúc này không. */
  get #canInteract() {
    if (this.#state.isOver || this.#isThinking) return false;
    return !this.#isVsAI || this.#state.currentPlayer === this.#settings.humanPlayer;
  }

  /** Số nước người chơi đã đánh (X luôn đi trước). */
  get #humanMoveCount() {
    const n = this.#state.moveCount;
    return this.#settings.humanPlayer === PLAYERS.X ? Math.ceil(n / 2) : Math.floor(n / 2);
  }

  get #canUndo() {
    return this.#isVsAI ? this.#humanMoveCount > 0 : this.#state.canUndo;
  }

  // ── Xử lý sự kiện ──

  handleCellClick(index) {
    if (!this.#canInteract) return;
    if (!this.#playMove(index)) return;
    this.#update();
    this.#maybePlayAI();
  }

  /**
   * Đấu AI: lùi về lượt gần nhất của người chơi, xóa luôn nước trả lời của AI.
   * 2 người: lùi 1 nước.
   */
  handleUndo() {
    if (!this.#canUndo) return;
    this.#cancelAI();
    this.#state.undo();
    if (this.#isVsAI) {
      while (this.#state.currentPlayer !== this.#settings.humanPlayer && this.#state.undo()) {
        // tiếp tục lùi cho tới khi đến lượt người chơi
      }
    }
    this.#hintIndex = null;
    this.#pendingEvents.push({ type: 'undo' });
    this.#update();
  }

  handleReset() {
    this.#cancelAI();
    this.#state.reset(PLAYERS.X);
    this.#hintIndex = null;
    this.#resultRecorded = false;
    this.#update();
    this.#maybePlayAI(); // nếu người chơi chọn đi sau thì AI đánh trước
  }

  handleHint() {
    if (!this.#canInteract) return;
    this.#hintIndex = getHint(this.#state.board, this.#state.currentPlayer);
    this.#pendingEvents.push({ type: 'hint' });
    this.#update();
  }

  handleSettingsChange(settings) {
    const { mode, difficulty, humanPlayer } = { ...this.#settings, ...sanitizeSettings(settings) };
    this.#settings = { ...this.#settings, mode, difficulty, humanPlayer };
    this.#prefs.save({ mode, difficulty, humanPlayer });
    this.handleReset(); // đổi cài đặt → bắt đầu ván mới
  }

  handleToggleMute() {
    this.#settings.muted = !this.#settings.muted;
    this.#prefs.save({ muted: this.#settings.muted });
    this.#view.setMuted(this.#settings.muted);
  }

  handleResetStats() {
    this.#stats.reset();
    this.#update();
  }

  // ── Nước đi & kết thúc ván ──

  /** Đánh 1 nước cho người chơi hiện tại (người hoặc AI). */
  #playMove(index) {
    const player = this.#state.currentPlayer;
    if (!this.#state.makeMove(index)) return false;

    this.#hintIndex = null;
    this.#pendingEvents.push({ type: 'move', player, index });

    const result = this.#state.result;
    if (result) this.#finishGame(result);
    return true;
  }

  #finishGame(result) {
    const outcome = this.#outcomeOf(result);
    if (!this.#resultRecorded) {
      if (this.#isVsAI) this.#stats.recordPve(this.#settings.difficulty, outcome);
      else this.#stats.recordPvp(result.winner);
      this.#resultRecorded = true;
    }
    this.#pendingEvents.push({ type: 'end', winner: result.winner, outcome });
  }

  #outcomeOf(result) {
    if (result.winner === DRAW) return 'draw';
    if (!this.#isVsAI) return 'win';
    return result.winner === this.#settings.humanPlayer ? 'win' : 'loss';
  }

  // ── AI ──

  #maybePlayAI() {
    if (!this.#isVsAI || this.#state.isOver) return;
    if (this.#state.currentPlayer !== this.#aiPlayer) return;

    // Độ trễ giả để người chơi kịp nhìn thấy nước của mình, cảm giác tự nhiên hơn.
    this.#aiTimer = setTimeout(() => {
      this.#aiTimer = null;
      const move = getAIMove(this.#state.board, this.#aiPlayer, this.#settings.difficulty);
      if (move !== null) this.#playMove(move);
      this.#update();
    }, this.#aiDelayMs);

    this.#update(); // hiển thị trạng thái "AI đang suy nghĩ…"
  }

  #cancelAI() {
    if (this.#aiTimer !== null) {
      clearTimeout(this.#aiTimer);
      this.#aiTimer = null;
    }
  }

  // ── Gửi dữ liệu cho View ──

  /** Ảnh chụp đầy đủ để View hiển thị (và để test kiểm tra). */
  getViewModel() {
    const { mode, difficulty, humanPlayer } = this.#settings;
    return {
      ...this.#state.snapshot(),
      canUndo: this.#canUndo,
      canInteract: this.#canInteract,
      isThinking: this.#isThinking,
      hintIndex: this.#hintIndex,
      mode,
      difficulty,
      difficultyLabel: DIFFICULTY[difficulty].label,
      humanPlayer,
      aiPlayer: this.#aiPlayer,
      stats: this.#isVsAI ? this.#stats.getPve(difficulty) : this.#stats.getPvp(),
    };
  }

  /** Vẽ lại trước, rồi mới phát các hiệu ứng đi kèm (âm thanh, confetti…). */
  #update() {
    this.#view.render(this.getViewModel());
    const events = this.#pendingEvents;
    this.#pendingEvents = [];
    for (const event of events) this.#view.announce(event);
  }
}
