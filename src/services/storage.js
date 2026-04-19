import { STORAGE_KEY } from '../shared/config.js';
import { getCurrentDayId } from '../core/date.js';
import { normalizeTask } from '../core/task-model.js';

let saveTimer = 0;

export function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const source = Array.isArray(parsed?.tasks) ? parsed.tasks : Array.isArray(parsed) ? parsed : [];
    const result = [];
    for (let index = 0; index < source.length; index += 1) {
      const normalized = normalizeTask(source[index], getCurrentDayId(), index);
      if (normalized) result.push(normalized);
    }
    return result;
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, tasks }));
  } catch {}
}

export function scheduleSaveTasks(tasks, delay = 180) {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(() => {
    saveTasks(tasks);
    saveTimer = 0;
  }, delay);
}
