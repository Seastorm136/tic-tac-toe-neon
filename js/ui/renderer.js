// View: chỉ hiển thị trạng thái và chuyển sự kiện người dùng cho Controller.
// Không chứa bất kỳ luật chơi nào.

import { BOARD_SIZE, DRAW, MODES, PLAYERS } from '../core/constants.js';
import { positionWinLine } from './effects.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Phím tắt → tên hành động (phím 1–9 xử lý riêng). */
const KEY_ACTIONS = Object.freeze({ h: 'hint', u: 'undo', n: 'reset' });

/** Tạo quân X/O bằng SVG. pathLength="1" giúp animation "tự vẽ nét" dễ viết bằng CSS. */
function createPiece(player) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', `piece piece--${player.toLowerCase()}`);
  svg.setAttribute('aria-hidden', 'true');

  const shapes = player === PLAYERS.X
    ? [['line', { x1: 24, y1: 24, x2: 76, y2: 76 }], ['line', { x1: 76, y1: 24, x2: 24, y2: 76 }]]
    : [['circle', { cx: 50, cy: 50, r: 28, transform: 'rotate(-90 50 50)' }]];

  for (const [tag, attrs] of shapes) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
    el.setAttribute('pathLength', '1');
    svg.append(el);
  }
  return svg;
}

/** Chạy lại một animation CSS bằng cách gỡ class rồi gắn lại. */
function restartAnimation(el, className) {
  el.classList.remove(className);
  void el.getBoundingClientRect(); // ép trình duyệt tính lại layout
  el.classList.add(className);
}

export class Renderer {
  #el;
  #cells = [];
  #cellValues = Array(BOARD_SIZE).fill(null);
  #handlers = {};
  #sound;
  #confetti;
  #hasRendered = false;
  #winLine = null;   // đường thắng đang hiển thị
  #scoreCache = {};  // để biết khi nào điểm tăng → hiệu ứng "nảy"

  /**
   * @param {Document} root
   * @param {{ sound?: import('./sound.js').SoundEngine, confetti?: import('./effects.js').Confetti }} [fx]
   */
  constructor(root = document, { sound = null, confetti = null } = {}) {
    const $ = (selector) => root.querySelector(selector);
    this.#el = {
      board: $('#board'),
      boardWrap: $('.board-wrap'),
      winLine: $('#win-line'),
      status: $('#status'),
      undo: $('#undo-btn'),
      hint: $('#hint-btn'),
      reset: $('#reset-btn'),
      mute: $('#mute-btn'),
      resetStats: $('#reset-stats-btn'),
      settings: $('#settings'),
      aiOptions: $('#ai-options'),
      scores: { left: $('#score-left'), draw: $('#score-draw'), right: $('#score-right') },
    };
    this.#sound = sound;
    this.#confetti = confetti;
    this.#createCells();
    this.#bindDomEvents(root);
  }

  #createCells() {
    for (let i = 0; i < BOARD_SIZE; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = String(i);
      this.#el.board.append(cell);
      this.#cells.push(cell);
    }
  }

  // ── Sự kiện DOM → callback của Controller ──

  #emit(name, ...args) {
    this.#handlers[name]?.(...args);
  }

  #bindDomEvents(root) {
    const el = this.#el;

    // Event delegation: 1 listener cho cả bàn cờ thay vì 9 listener.
    el.board.addEventListener('click', (event) => {
      const cell = event.target.closest('.cell');
      if (cell && !cell.disabled) this.#emit('cell', Number(cell.dataset.index));
    });
    el.undo.addEventListener('click', () => this.#emit('undo'));
    el.hint.addEventListener('click', () => this.#emit('hint'));
    el.reset.addEventListener('click', () => this.#emit('reset'));
    el.mute.addEventListener('click', () => this.#emit('mute'));
    el.resetStats.addEventListener('click', () => {
      if (confirm('Xóa toàn bộ thống kê thắng/thua/hòa?')) this.#emit('resetStats');
    });
    el.settings.addEventListener('submit', (event) => event.preventDefault());
    el.settings.addEventListener('change', () => this.#emit('settings', this.getSettings()));

    el.boardWrap.addEventListener('animationend', (event) => {
      if (event.target === el.boardWrap) el.boardWrap.classList.remove('board--shake');
    });

    root.addEventListener('keydown', (event) => this.#handleKey(event));

    // Kích thước bàn cờ đổi (xoay màn hình, resize) → đặt lại đường thắng.
    new ResizeObserver(() => this.#layoutWinLine()).observe(el.board);
  }

  #handleKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target instanceof Element && event.target.closest('select, textarea, input:not([type="radio"])')) return;

    const key = event.key.toLowerCase();
    if (/^[1-9]$/.test(key)) {
      const index = Number(key) - 1;
      if (!this.#cells[index].disabled) this.#emit('cell', index);
    } else if (KEY_ACTIONS[key]) {
      const action = KEY_ACTIONS[key];
      if (!this.#el[action].disabled) this.#emit(action);
    } else {
      return;
    }
    event.preventDefault();
  }

  onCellClick(handler) { this.#handlers.cell = handler; }
  onUndo(handler) { this.#handlers.undo = handler; }
  onReset(handler) { this.#handlers.reset = handler; }
  onHint(handler) { this.#handlers.hint = handler; }
  onSettingsChange(handler) { this.#handlers.settings = handler; }
  onToggleMute(handler) { this.#handlers.mute = handler; }
  onResetStats(handler) { this.#handlers.resetStats = handler; }

  // ── Cài đặt & âm thanh ──

  getSettings() {
    const form = this.#el.settings.elements;
    return {
      mode: form.mode.value,
      difficulty: form.difficulty.value,
      humanPlayer: form.humanPlayer.value,
    };
  }

  setSettings({ mode, difficulty, humanPlayer }) {
    const form = this.#el.settings.elements;
    form.mode.value = mode;
    form.difficulty.value = difficulty;
    form.humanPlayer.value = humanPlayer;
  }

  setMuted(muted) {
    this.#sound?.setMuted(muted);
    const btn = this.#el.mute;
    btn.textContent = muted ? '🔇' : '🔊';
    btn.setAttribute('aria-pressed', String(muted));
    btn.title = muted ? 'Bật âm thanh' : 'Tắt âm thanh';
  }

  // ── Vẽ lại giao diện từ view model của Controller ──

  render(vm) {
    const { board, result, canUndo, canInteract, isThinking, hintIndex, mode } = vm;
    const winSet = new Set(result?.line ?? []);

    board.forEach((value, i) => {
      this.#renderCell(i, value, {
        win: winSet.has(i),
        hint: i === hintIndex,
        disabled: value !== null || !canInteract,
      });
    });

    const boardEl = this.#el.board;
    boardEl.dataset.turn = canInteract ? vm.currentPlayer : ''; // quân mờ khi hover
    boardEl.classList.toggle('board--over', result !== null);
    boardEl.classList.toggle('board--thinking', isThinking);

    this.#renderWinLine(result);
    this.#renderStatus(vm);
    this.#renderScores(vm);

    this.#el.undo.disabled = !canUndo;
    this.#el.hint.disabled = !canInteract;
    this.#el.aiOptions.hidden = mode !== MODES.PVE;
    this.#hasRendered = true;
  }

  #renderCell(i, value, { win, hint, disabled }) {
    const cell = this.#cells[i];

    // Chỉ dựng lại SVG khi giá trị ô thay đổi → quân cũ không bị vẽ lại animation.
    if (this.#cellValues[i] !== value) {
      cell.replaceChildren();
      if (value) {
        const piece = createPiece(value);
        if (this.#hasRendered) piece.classList.add('piece--new');
        cell.append(piece);
      }
      this.#cellValues[i] = value;
    }

    cell.classList.toggle('cell--x', value === PLAYERS.X);
    cell.classList.toggle('cell--o', value === PLAYERS.O);
    cell.classList.toggle('cell--win', win);
    cell.classList.toggle('cell--hint', hint);
    cell.disabled = disabled;
    cell.setAttribute('aria-label', `Ô ${i + 1}: ${value ?? 'trống'}${hint ? ' (gợi ý)' : ''}`);
  }

  #renderWinLine(result) {
    const svg = this.#el.winLine;
    const line = result?.line ?? null;
    if (line?.join() === this.#winLine?.join()) return; // không đổi

    this.#winLine = line;
    svg.classList.remove('win-line--show');
    if (!line) return;

    svg.dataset.player = result.winner;
    this.#layoutWinLine();
    restartAnimation(svg, 'win-line--show');
  }

  #layoutWinLine() {
    if (!this.#winLine) return;
    const [first, , last] = this.#winLine;
    positionWinLine(this.#el.winLine, this.#cells[first], this.#cells[last]);
  }

  #renderStatus({ result, currentPlayer, isThinking, mode, humanPlayer }) {
    const vsAI = mode === MODES.PVE;
    let text;
    let player = '';

    if (isThinking) {
      text = '🤖 AI đang suy nghĩ…';
      player = currentPlayer;
    } else if (result === null) {
      text = vsAI ? `Lượt của bạn (${currentPlayer})` : `Lượt của ${currentPlayer}`;
      player = currentPlayer;
    } else if (result.winner === DRAW) {
      text = 'Hòa! 🤝';
    } else {
      player = result.winner;
      if (!vsAI) text = `${result.winner} thắng! 🎉`;
      else text = result.winner === humanPlayer ? 'Bạn thắng! 🎉' : 'AI thắng! 🤖';
    }

    this.#el.status.textContent = text;
    this.#el.status.dataset.player = player;
    this.#el.status.classList.toggle('status--thinking', isThinking);
  }

  #renderScores({ mode, stats, humanPlayer, aiPlayer, difficulty, difficultyLabel }) {
    const vsAI = mode === MODES.PVE;
    const entries = vsAI
      ? { left: [`Bạn (${humanPlayer})`, stats.win, humanPlayer],
          draw: ['Hòa', stats.draw, ''],
          right: [`AI · ${difficultyLabel}`, stats.loss, aiPlayer] }
      : { left: ['Người chơi X', stats.X, PLAYERS.X],
          draw: ['Hòa', stats.draw, ''],
          right: ['Người chơi O', stats.O, PLAYERS.O] };

    const context = vsAI ? `pve:${difficulty}` : 'pvp';
    for (const [slot, [label, value, player]] of Object.entries(entries)) {
      const el = this.#el.scores[slot];
      el.querySelector('.score__label').textContent = label;
      el.querySelector('.score__value').textContent = String(value);
      el.dataset.player = player;

      const prev = this.#scoreCache[slot];
      if (prev?.context === context && value > prev.value) restartAnimation(el, 'score--bump');
      this.#scoreCache[slot] = { context, value };
    }
  }

  // ── Hiệu ứng theo sự kiện ──

  announce(event) {
    switch (event.type) {
      case 'move':
        this.#sound?.play(event.player === PLAYERS.X ? 'placeX' : 'placeO');
        break;
      case 'hint':
        this.#sound?.play('hint');
        break;
      case 'undo':
        this.#sound?.play('undo');
        break;
      case 'end':
        this.#celebrate(event);
        break;
    }
  }

  #celebrate({ winner, outcome }) {
    if (outcome === 'draw') {
      this.#sound?.play('draw');
    } else if (outcome === 'loss') {
      this.#sound?.play('lose');
      restartAnimation(this.#el.boardWrap, 'board--shake');
    } else {
      this.#sound?.play('win');
      const css = getComputedStyle(document.documentElement);
      const color = (name) => css.getPropertyValue(name).trim();
      this.#confetti?.burst([color(winner === PLAYERS.X ? '--neon-x' : '--neon-o'), color('--neon-win'), '#ffffff']);
    }
  }
}
