// Ghi nhớ lựa chọn của người chơi (chế độ, độ khó, quân, tắt tiếng) giữa các lần mở game.
// Chỉ lưu/đọc thô — việc kiểm tra giá trị hợp lệ do Controller đảm nhận.

import { createMemoryStorage, readJSON, writeJSON } from './storage.js';

export const PREFS_KEY = 'neon-ttt:prefs:v1';

export function createPrefsStore(storage = createMemoryStorage()) {
  const load = () => {
    const raw = readJSON(storage, PREFS_KEY, {});
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  };

  return {
    load,
    save(partial) {
      writeJSON(storage, PREFS_KEY, { ...load(), ...partial });
    },
  };
}
