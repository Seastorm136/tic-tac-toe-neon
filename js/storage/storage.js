// Tiện ích lưu trữ an toàn. localStorage có thể bị chặn (chế độ ẩn danh, iframe…)
// hoặc chứa dữ liệu hỏng → luôn có phương án dự phòng, không bao giờ làm game crash.

/** Bộ nhớ tạm có cùng giao diện với localStorage (dùng khi bị chặn và khi test). */
export function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

/** Trả về localStorage nếu dùng được, nếu không thì dùng bộ nhớ tạm. */
export function getDefaultStorage() {
  try {
    const storage = globalThis.localStorage;
    const probe = '__neon_ttt_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return createMemoryStorage();
  }
}

export function readJSON(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback; // JSON hỏng → coi như chưa có dữ liệu
  }
}

export function writeJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Hết dung lượng hoặc bị chặn: bỏ qua, game vẫn chạy bình thường.
  }
}
