// Thống kê thắng/thua/hòa, lưu trên máy người chơi.

import { createMemoryStorage, readJSON, writeJSON } from './storage.js';

export const STATS_KEY = 'neon-ttt:stats:v1';
const LEVELS = ['easy', 'medium', 'hard'];
const PVE_OUTCOMES = ['win', 'loss', 'draw'];
const PVP_OUTCOMES = ['X', 'O', 'draw'];

function createDefaults() {
  return {
    pve: Object.fromEntries(LEVELS.map((level) => [level, { win: 0, loss: 0, draw: 0 }])),
    pvp: { X: 0, O: 0, draw: 0 },
  };
}

const isCount = (v) => Number.isInteger(v) && v >= 0;

/** Chỉ giữ lại những số liệu hợp lệ, phần còn lại lấy giá trị mặc định. */
function sanitize(raw) {
  const data = createDefaults();
  for (const level of LEVELS) {
    for (const key of PVE_OUTCOMES) {
      const v = raw?.pve?.[level]?.[key];
      if (isCount(v)) data.pve[level][key] = v;
    }
  }
  for (const key of PVP_OUTCOMES) {
    const v = raw?.pvp?.[key];
    if (isCount(v)) data.pvp[key] = v;
  }
  return data;
}

export function createStatsStore(storage = createMemoryStorage()) {
  let data = sanitize(readJSON(storage, STATS_KEY, null));
  const save = () => writeJSON(storage, STATS_KEY, data);

  return {
    /** @returns {{ win: number, loss: number, draw: number }} */
    getPve(level) {
      return { ...data.pve[level] };
    },

    /** @returns {{ X: number, O: number, draw: number }} */
    getPvp() {
      return { ...data.pvp };
    },

    /** @param {'win' | 'loss' | 'draw'} outcome kết quả nhìn từ phía người chơi */
    recordPve(level, outcome) {
      if (!LEVELS.includes(level) || !PVE_OUTCOMES.includes(outcome)) {
        throw new Error(`Thống kê không hợp lệ: ${level}/${outcome}`);
      }
      data.pve[level][outcome]++;
      save();
    },

    /** @param {'X' | 'O' | 'draw'} winner */
    recordPvp(winner) {
      if (!PVP_OUTCOMES.includes(winner)) throw new Error(`Thống kê không hợp lệ: ${winner}`);
      data.pvp[winner]++;
      save();
    },

    reset() {
      data = createDefaults();
      save();
    },
  };
}
