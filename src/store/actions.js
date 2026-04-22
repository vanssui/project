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
import { bindStorageFlush, loadTasks, scheduleSaveTasks, subscribeToStorage } from '../services/storage.js';
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
import { state, setCompactMode, setFilter, setSearchQuery, setTasks } from './state.js';
import { normalizeSearchQuery, validateTitle } from '../shared/utils.js';
import { COMPACT_MODE_KEY, LONG_PRESS_MS, SAVE_DELAY, THEME_KEY } from '../shared/config.js';

const pendingToggleIds = new Set();

function tasksSignature(tasks) {
  return JSON.stringify(tasks);
}

function syncFilterButtons(filterValue) {
  dom.filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === filterValue;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function syncAddButtonState() {
  const isValid = validateTitle(dom.taskInput.value).ok;
  dom.addTaskBtn.disabled = !isValid;
  dom.addTaskBtn.setAttribute('aria-disabled', String(!isValid));
}

function syncSearchUi() {
  if (
    dom.taskSearchInput &&
    document.activeElement !== dom.taskSearchInput &&
    dom.taskSearchInput.value !== state.searchQuery
  ) {
    dom.taskSearchInput.value = state.searchQuery;
  }
  if (dom.clearSearchBtn) {
    const hasQuery = Boolean(state.searchQuery);
    dom.clearSearchBtn.disabled = !hasQuery;
    dom.clearSearchBtn.setAttribute('aria-disabled', String(!hasQuery));
  }
}

function syncCompactUi() {
  dom.body.classList.toggle('compact-mode', state.compactMode);
  if (!dom.compactToggleBtn) return;
  dom.compactToggleBtn.classList.toggle('active', state.compactMode);
  dom.compactToggleBtn.setAttribute('aria-pressed', String(state.compactMode));
  dom.compactToggleBtn.textContent = 'Compact';
}

function persistAndRender() {
  scheduleSaveTasks(state.tasks, SAVE_DELAY);
  renderApp();
  refreshDayModal();
  syncAddButtonState();
  syncSearchUi();
  syncCompactUi();
}

function focusTaskInput() {
  dom.taskInput.focus();
}

function markRecentTask(taskId) {
  state.recentTaskId = taskId;
  window.setTimeout(() => {
    if (state.recentTaskId === taskId) {
      state.recentTaskId = null;
    }
  }, 1200);
}

export function initializeState() {
  setTasks(loadTasks());
  try {
    setCompactMode(localStorage.getItem(COMPACT_MODE_KEY) === '1');
  } catch {
    setCompactMode(false);
  }
  syncFilterButtons(state.activeFilter);
  syncAddButtonState();
  syncSearchUi();
  syncCompactUi();
  subscribeToStorage((nextTasks) => {
    if (tasksSignature(nextTasks) === tasksSignature(state.tasks)) return;
    setTasks(nextTasks);
    renderApp();
    refreshDayModal();
    showToast('Список задач обновлён из другой вкладки.', 'info', 'Sync');
  });
  bindStorageFlush();
}

export function getDayTasks(dayId) {
  return getVisibleDayTasks(state.tasks, dayId, state.activeFilter, state.searchQuery);
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
  markRecentTask(task.id);
  dom.taskInput.value = '';
  persistAndRender();
  focusTaskInput();
  showToast('Задача добавлена.', 'success', 'Добавлено');
}

export function duplicateTask(taskId) {
  const source = state.tasks.find((item) => item.id === taskId);
  if (!source) return;

  const task = createTask({
    title: source.title,
    day: source.day,
    cat: source.cat,
    pri: source.pri
  });

  setTasks(addTaskOp(state.tasks, task));
  markRecentTask(task.id);
  dom.taskDaySelect.value = task.day;
  dom.taskCatSelect.value = task.cat;
  dom.taskPriSelect.value = task.pri;
  persistAndRender();
  showToast('Задача продублирована.', 'success', 'Копия создана');
}

export async function toggleTask(taskId, element = null) {
  if (pendingToggleIds.has(taskId)) return;
  pendingToggleIds.add(taskId);
  element?.setAttribute('aria-busy', 'true');
  element?.classList.add('is-pending');

  if (element) element.classList.add('closing');
  window.setTimeout(() => {
    const result = toggleTaskDone(state.tasks, taskId, Date.now());
    pendingToggleIds.delete(taskId);
    if (!result.changed) {
      element?.classList.remove('is-pending');
      element?.removeAttribute('aria-busy');
      return;
    }
    const toggled = result.tasks.find((task) => task.id === taskId);
    setTasks(result.tasks);
    persistAndRender();
    showToast(
      toggled?.done ? 'Отправлено в архив.' : 'Восстановлено.',
      'success',
      toggled?.done ? 'Выполнено' : 'Возвращено'
    );
    element?.classList.remove('is-pending');
    element?.removeAttribute('aria-busy');
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
  }, LONG_PRESS_MS);
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
  syncFilterButtons(filterValue);
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

export function handleTaskInputChange() {
  syncAddButtonState();
}

export function handleSearchChange(value) {
  const nextQuery = normalizeSearchQuery(value);
  if (state.searchQuery === nextQuery) {
    syncSearchUi();
    return;
  }
  setSearchQuery(nextQuery);
  renderApp();
  refreshDayModal();
  syncSearchUi();
}

export function clearSearch() {
  if (!state.searchQuery) {
    syncSearchUi();
    dom.taskSearchInput?.focus();
    return;
  }
  setSearchQuery('');
  renderApp();
  refreshDayModal();
  syncSearchUi();
  dom.taskSearchInput?.focus();
}

export function scrollToToday() {
  const todayCard = dom.grid.querySelector(`.day-card[data-day="${state.currentDayId}"]`);
  if (!todayCard) return;
  todayCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  todayCard.classList.add('is-spotlit');
  todayCard.focus({ preventScroll: true });
  window.setTimeout(() => {
    todayCard.classList.remove('is-spotlit');
  }, 1400);
}

export function toggleCompactMode() {
  const nextMode = !state.compactMode;
  setCompactMode(nextMode);
  try {
    localStorage.setItem(COMPACT_MODE_KEY, nextMode ? '1' : '0');
  } catch {}
  syncCompactUi();
  renderApp();
  refreshDayModal();
  showToast(nextMode ? 'Включён компактный режим.' : 'Возвращён обычный режим.', 'info', 'Вид');
}

export function handleApplyPreset({ cat = '', pri = '' } = {}) {
  if (cat) dom.taskCatSelect.value = cat;
  if (pri) dom.taskPriSelect.value = pri;
  if (state.currentDayId) dom.taskDaySelect.value = state.currentDayId;
  focusTaskInput();
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
  syncAddButtonState();
  syncSearchUi();
  syncCompactUi();
}

export { focusTaskInput };
