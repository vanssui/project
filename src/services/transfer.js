import { IMPORT_LIMIT } from '../shared/config.js';
import { normalizeTask } from '../core/task-model.js';
import { getCurrentDayId } from '../core/date.js';

export function exportTasksToFile(tasks) {
  const payload = {
    app: 'VAN TRU FREE',
    version: 2,
    exportedAt: new Date().toISOString(),
    tasks
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `van-tru-free-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function readTasksFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve([]);
      return;
    }

    if (file.size === 0) {
      reject(new Error('Файл пустой.'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('Файл слишком большой (2MB).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = typeof event.target?.result === 'string' ? event.target.result : '';
        if (!raw.trim()) throw new Error('Файл не содержит данных.');
        const parsed = JSON.parse(raw);
        const source = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tasks) ? parsed.tasks : null;
        if (!Array.isArray(source)) throw new Error('Список задач не найден.');
        if (source.length > IMPORT_LIMIT) throw new Error(`Слишком много задач (лимит ${IMPORT_LIMIT}).`);
        const normalized = [];
        let skippedCount = 0;
        for (let index = 0; index < source.length; index += 1) {
          const task = normalizeTask(source[index], getCurrentDayId(), index);
          if (task) {
            normalized.push(task);
          } else {
            skippedCount += 1;
          }
        }
        if (!normalized.length) {
          throw new Error('Не найдено ни одной корректной задачи для импорта.');
        }
        resolve({
          tasks: normalized,
          sourceCount: source.length,
          skippedCount
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.readAsText(file);
  });
}
