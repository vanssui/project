import { STORAGE_KEY } from '../shared/config.js';
import { getCurrentDayId } from '../core/date.js';
import { normalizeTask } from '../core/task-model.js';

let saveTimer = 0;
let queuedTasks = null;

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
  queuedTasks = tasks;
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(() => {
    saveTasks(queuedTasks || tasks);
    queuedTasks = null;
    saveTimer = 0;
  }, delay);
}

export function flushSaveTasks() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = 0;
  }
  if (!queuedTasks) return;
  saveTasks(queuedTasks);
  queuedTasks = null;
}

export function bindStorageFlush() {
  const flush = () => flushSaveTasks();
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flushSaveTasks();
    }
  };

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

export function subscribeToStorage(onTasksChange) {
  const handleStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    onTasksChange(loadTasks());
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}
