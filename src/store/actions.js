import { createTask } from '../core/task-model.js';
import {
  addTask as addTaskOp,
  appendImportedTasks,
  clearArchive as clearArchiveOp,
  deleteTask as deleteTaskOp,
  moveTaskToDay,
  replaceTasks,
  toggleTaskDone,
  updateTaskTitle
} from '../core/task-ops.js';
import { getVisibleDayTasks } from '../core/task-selectors.js';
import { loadTasks, scheduleSaveTasks } from '../services/storage.js';
import { exportTasksToFile, readTasksFile } from '../services/transfer.js';
import { openTelegram } from '../services/telegram.js';
import { applyTheme } from '../services/theme.js';
import { dom } from '../ui/dom.js';
import { showToast } from '../ui/toasts.js';
import {
  closeConfirmModal,
  closeDayModal,
  closeEditModal,
  closePreviewModal,
  openConfirmModal,
  openDayModal,
  openEditModal,
  openPreviewModal,
  refreshDayModal
} from '../ui/modals.js';
import { renderApp } from '../ui/render.js';
import { state, setFilter, setTasks } from './state.js';
import { validateTitle } from '../shared/utils.js';
import { THEME_KEY } from '../shared/config.js';

function persistAndRender() {
  scheduleSaveTasks(state.tasks);
  renderApp();
  refreshDayModal();
}

function focusTaskInput() {
  dom.taskInput.focus();
}

export function initializeState() {
  setTasks(loadTasks());
}

export function getDayTasks(dayId) {
  return getVisibleDayTasks(state.tasks, dayId, state.activeFilter);
}

export async function addTask() {
  const result = validateTitle(dom.taskInput.value);
  if (!result.ok) {
    showToast('Введи корректное название задачи.', 'warning', 'Пустое поле');
    focusTaskInput();
    return;
  }

  const task = createTask({
    title: result.value,
    day: dom.taskDaySelect.value,
    cat: dom.taskCatSelect.value,
    pri: dom.taskPriSelect.value
  });

  setTasks(addTaskOp(state.tasks, task));
  dom.taskInput.value = '';
  persistAndRender();
  focusTaskInput();
  showToast('Задача добавлена.', 'success', 'Добавлено');
}

export async function toggleTask(taskId, element = null) {
  if (element) element.classList.add('closing');
  window.setTimeout(() => {
    const result = toggleTaskDone(state.tasks, taskId, Date.now());
    if (!result.changed) return;
    const toggled = result.tasks.find((task) => task.id === taskId);
    setTasks(result.tasks);
    persistAndRender();
    showToast(
      toggled?.done ? 'Отправлено в архив.' : 'Восстановлено.',
      'success',
      toggled?.done ? 'Выполнено' : 'Возвращено'
    );
  }, 160);
}

export async function deleteTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const confirmed = await openConfirmModal({
    kicker: 'Удаление',
    title: 'Удалить задачу?',
    text: task.title,
    buttons: [
      { label: 'Отмена', value: false, className: 'ghost' },
      { label: 'Удалить', value: true, className: 'danger' }
    ]
  });

  if (!confirmed) return;

  const result = deleteTaskOp(state.tasks, taskId);
  if (!result.changed) return;
  setTasks(result.tasks);
  persistAndRender();
  showToast('Задача удалена.', 'success', 'Удалено');
}

export async function editTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const value = await openEditModal(task);
  if (value === null) return;

  const result = validateTitle(value);
  if (!result.ok) {
    showToast('Название задачи не может быть пустым.', 'warning', 'Редактирование');
    return;
  }

  const update = updateTaskTitle(state.tasks, taskId, result.value);
  if (!update.changed) return;
  setTasks(update.tasks);
  persistAndRender();
  showToast('Задача обновлена.', 'success', 'Сохранено');
}

export function previewTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  openPreviewModal(task.title);
}

export function startLongPress(taskId) {
  cancelLongPress();
  state.longPressTriggered = false;
  state.longPressTimer = window.setTimeout(() => {
    state.longPressTimer = 0;
    state.longPressTriggered = true;
    editTask(taskId);
  }, 550);
}

export function cancelLongPress() {
  if (!state.longPressTimer) return;
  clearTimeout(state.longPressTimer);
  state.longPressTimer = 0;
}

export async function clearArchive() {
  const doneCount = state.tasks.filter((task) => task.done).length;
  if (!doneCount) {
    showToast('Архив уже пуст.', 'info', 'Архив');
    return;
  }

  const confirmed = await openConfirmModal({
    kicker: 'Архив',
    title: 'Очистить архив?',
    text: `Будут удалены все выполненные задачи: ${doneCount}.`,
    buttons: [
      { label: 'Отмена', value: false, className: 'ghost' },
      { label: 'Очистить', value: true, className: 'danger' }
    ]
  });

  if (!confirmed) return;
  const result = clearArchiveOp(state.tasks);
  if (!result.changed) return;
  setTasks(result.tasks);
  persistAndRender();
  showToast('Архив очищен.', 'success', 'Готово');
}

export function applyFilter(filterValue) {
  if (state.activeFilter === filterValue) return;
  setFilter(filterValue);
  dom.filterButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === filterValue);
  });
  renderApp();
  refreshDayModal();
  showToast(`Фильтр: ${filterValue === 'all' ? 'Все' : filterValue}`, 'info', 'Фильтр');
}

export async function importFromFile(file) {
  if (!file) return;
  try {
    const tasks = await readTasksFile(file);
    const mode = await openConfirmModal({
      kicker: 'Импорт JSON',
      title: 'Как импортировать задачи?',
      text: `Найдено задач: ${tasks.length}`,
      buttons: [
        { label: 'Отмена', value: 'cancel', className: 'ghost' },
        { label: 'Добавить к текущим', value: 'append', className: 'primary' },
        { label: 'Заменить текущие', value: 'replace', className: 'danger' }
      ]
    });

    if (!mode || mode === 'cancel') {
      showToast('Импорт отменён.', 'info', 'Import');
      return;
    }

    if (mode === 'replace') {
      setTasks(replaceTasks(tasks));
    } else {
      setTasks(appendImportedTasks(state.tasks, tasks));
    }

    persistAndRender();
    showToast(`Импорт завершён: ${tasks.length} задач.`, 'success', 'Import');
  } catch (error) {
    showToast(error.message || 'Ошибка импорта.', 'error', 'Import');
  } finally {
    dom.jsonFileInput.value = '';
  }
}

export function exportTasks() {
  exportTasksToFile(state.tasks);
  showToast('Экспортирован JSON.', 'success', 'Export');
}

export function moveTask(taskId, dayId) {
  const result = moveTaskToDay(state.tasks, taskId, dayId);
  if (!result.changed) return;
  setTasks(result.tasks);
  dom.taskDaySelect.value = dayId;
  persistAndRender();
  showToast('Задача перенесена.', 'success', 'Перемещено');
}

export function openDay(dayId) {
  state.openedDayModalId = dayId;
  openDayModal(dayId);
}

export function closeConfirm(value = null) {
  closeConfirmModal(value);
}

export function closeEdit(value = null) {
  closeEditModal(value);
}

export function submitEdit() {
  const value = dom.editTaskInput.value;
  closeEditModal(value);
}

export function closePreview(value = null) {
  closePreviewModal(value);
}

export function closeDay(value = null) {
  state.openedDayModalId = null;
  closeDayModal(value);
}

export function handleThemeChange(theme, persist = true) {
  applyTheme(theme, {
    themeToggle: dom.themeToggle,
    themeLabel: dom.themeLabel,
    stateRef: state,
    persist
  });
}

export function handleSystemThemeChange(theme) {
  let savedTheme = '';
  try {
    savedTheme = localStorage.getItem(THEME_KEY) || '';
  } catch {}
  if (!savedTheme) {
    handleThemeChange(theme, false);
  }
}

export function handleOpenTelegram() {
  openTelegram();
}

export function runInitialRender() {
  renderApp();
}

export { focusTaskInput };
