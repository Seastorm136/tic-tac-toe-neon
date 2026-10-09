// Điểm khởi chạy: tạo các module và nối chúng lại với nhau.

import { GameState } from './core/gameState.js';
import { GameController } from './controller/gameController.js';
import { Renderer } from './ui/renderer.js';
import { SoundEngine } from './ui/sound.js';
import { Confetti } from './ui/effects.js';
import { getDefaultStorage } from './storage/storage.js';
import { createStatsStore } from './storage/statsStore.js';
import { createPrefsStore } from './storage/prefsStore.js';

const storage = getDefaultStorage();

const sound = new SoundEngine();
sound.attachUnlock(document);

const view = new Renderer(document, {
  sound,
  confetti: new Confetti(document.querySelector('#confetti')),
});

const controller = new GameController(new GameState(), view, {
  stats: createStatsStore(storage),
  prefs: createPrefsStore(storage),
});

controller.init();
