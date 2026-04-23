import { STORAGE_KEY } from '../shared/config.js';
import { getCurrentDayId } from '../core/date.js';
import { normalizeTask } from '../core/task-model.js';

let saveTimer = 0;
let queuedTasks = null;
let storageErrorHandler = () => {};

export function hasStoredTasksPayload() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function setStorageErrorHandler(handler) {
  storageErrorHandler = typeof handler === 'function' ? handler : () => {};
}

export function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const source = Array.isArray(parsed?.tasks) ? parsed.tasks : Array.isArray(parsed) ? parsed : [];
    const result = [];
    let skippedCount = 0;
    for (let index = 0; index < source.length; index += 1) {
      const normalized = normalizeTask(source[index], getCurrentDayId(), index);
      if (normalized) {
        result.push(normalized);
      } else {
        skippedCount += 1;
      }
    }
    if (skippedCount > 0) {
      storageErrorHandler(`Часть сохранённых задач пропущена при восстановлении: ${skippedCount}.`, 'warning', 'Хранилище');
    }
    return result;
  } catch {
    storageErrorHandler('Не удалось прочитать сохранённые задачи. Открыт безопасный пустой список.', 'error', 'Хранилище');
    return [];
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, tasks }));
    return true;
  } catch {
    storageErrorHandler('Не удалось сохранить изменения в браузере. Освободи место или экспортируй JSON.', 'error', 'Хранилище');
    return false;
  }
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
