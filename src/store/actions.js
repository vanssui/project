import { createTask } from '../core/task-model.js';
import {
  addTask as addTaskOp,
  appendImportedTasks,
  clearArchive as clearArchiveOp,
  clearActiveTasks as clearActiveTasksOp,
  clearArchiveEarlier as clearArchiveEarlierOp,
  deleteTask as deleteTaskOp,
  moveTaskToDay,
  replaceTasks,
  toggleTaskDone,
  updateTaskTitle
} from '../core/task-ops.js';
import { groupArchiveTasks } from '../core/archive.js';
import { getVisibleDayTasks } from '../core/task-selectors.js';
import {
  bindStorageFlush,
  hasStoredTasksPayload,
  loadTasks,
  saveTasks,
  scheduleSaveTasks,
  setStorageErrorHandler,
  subscribeToStorage
} from '../services/storage.js';
import { exportTasksToFile, readTasksFile } from '../services/transfer.js';
import { createDemoTasks, hasSeededDemoBefore, markDemoSeedUsed } from '../services/demo-seed.js';
import { openTelegram } from '../services/telegram.js';
import { applyTheme } from '../services/theme.js';
import { dom } from '../ui/dom.js';
import { LONG_DURATION, showToast } from '../ui/toasts.js';
import {
  closeConfirmModal,
  closeDayModal,
  closeEditModal,
  closeTaskModal,
  openConfirmModal,
  openDayModal,
  openEditModal,
  openTaskModal,
  refreshDayModal
} from '../ui/modals.js';
import { renderApp } from '../ui/render.js';
import {
  buildTasksFingerprint,
  state,
  setCompactMode,
  setFilter,
  setFocusMode,
  setSearchQuery,
  setShowOnboarding,
  setTasks
} from './state.js';
import { normalizeSearchQuery, validateTitle } from '../shared/utils.js';
import {
  COMPACT_MODE_KEY,
  FOCUS_MODE_KEY,
  ONBOARDING_DISMISSED_KEY,
  SAVE_DELAY,
  THEME_KEY
} from '../shared/config.js';
import { buildStats } from '../core/stats.js';

const pendingToggleIds = new Set();
let completionPulseTimer = 0;

function syncPresetUi() {
  const currentCategory = dom.taskCatSelect?.value || 'Дом';
  const currentPriority = dom.taskPriSelect?.value || 'normal';
  dom.presetButtons.forEach((button) => {
    const isCategoryButton = Boolean(button.dataset.cat);
    const isPriorityButton = Boolean(button.dataset.pri);
    const isActive = isCategoryButton
      ? button.dataset.cat === currentCategory
      : isPriorityButton
        ? button.dataset.pri === currentPriority
        : false;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
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

function syncFocusUi() {
  dom.body.classList.toggle('focus-mode', state.focusMode);
  if (!dom.focusToggleBtn) return;
  dom.focusToggleBtn.classList.toggle('active', state.focusMode);
  dom.focusToggleBtn.setAttribute('aria-pressed', String(state.focusMode));
}

function syncOnboardingUi() {
  if (!dom.onboardingPanel) return;
  const isVisible = Boolean(state.showOnboarding);
  dom.onboardingPanel.hidden = !isVisible;
  dom.onboardingPanel.classList.toggle('is-hidden', !isVisible);
  dom.onboardingPanel.setAttribute('aria-hidden', String(!isVisible));
}

function persistAndRender() {
  scheduleSaveTasks(state.tasks, SAVE_DELAY);
  renderApp();
  refreshDayModal();
  syncAddButtonState();
  syncSearchUi();
  syncPresetUi();
  syncCompactUi();
  syncFocusUi();
  syncOnboardingUi();
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

function clearDemoSessionHint() {
  if (state.seededDemoSession) {
    state.seededDemoSession = false;
  }
}

function buildCompletionPraise(stats) {
  const streakDays = stats?.momentum?.streakDays || 0;
  const completedToday = stats?.momentum?.completedToday || 0;
  const rhythmLabel = stats?.insights?.rhythm?.label || 'Старт';
  if (streakDays >= 7) {
    return `Это уже система. ${rhythmLabel} и серия ${streakDays} дн.`;
  }
  if (streakDays >= 3) {
    return `Хороший ход. ${rhythmLabel}, серия ${streakDays} дн.`;
  }
  if (completedToday >= 5) {
    return `Сильный день. Уже закрыто ${completedToday}, уровень: ${rhythmLabel}.`;
  }
  if (completedToday >= 2) {
    return `Темп растёт. Сегодня закрыто ${completedToday}, уровень: ${rhythmLabel}.`;
  }
  return `Чисто. Первый шаг сделан, уровень: ${rhythmLabel}.`;
}

function playCompletionPulse() {
  if (!dom.body) return;
  dom.body.classList.remove('completion-pulse');
  void dom.body.offsetWidth;
  dom.body.classList.add('completion-pulse');
  if (completionPulseTimer) {
    clearTimeout(completionPulseTimer);
  }
  completionPulseTimer = window.setTimeout(() => {
    dom.body.classList.remove('completion-pulse');
    completionPulseTimer = 0;
  }, 720);
}

export function initializeState() {
  setStorageErrorHandler(showToast);
  const hasStoredPayload = hasStoredTasksPayload();
  const loadedTasks = loadTasks();
  if (!hasStoredPayload && !loadedTasks.length && !hasSeededDemoBefore()) {
    const demoTasks = createDemoTasks();
    state.seededDemoSession = true;
    setTasks(demoTasks);
    markDemoSeedUsed();
    saveTasks(demoTasks);
    showToast('Стартовая неделя загружена. Можешь сразу попробовать трекер вживую.', 'info', 'Быстрый старт');
  } else {
    state.seededDemoSession = false;
    setTasks(loadedTasks);
  }
  try {
    setCompactMode(localStorage.getItem(COMPACT_MODE_KEY) === '1');
  } catch {
    setCompactMode(false);
  }
  try {
    setFocusMode(localStorage.getItem(FOCUS_MODE_KEY) === '1');
  } catch {
    setFocusMode(false);
  }
  try {
    setShowOnboarding(localStorage.getItem(ONBOARDING_DISMISSED_KEY) !== '1');
  } catch {
    setShowOnboarding(true);
  }
  syncFilterButtons(state.activeFilter);
  syncAddButtonState();
  syncSearchUi();
  syncPresetUi();
  syncCompactUi();
  syncFocusUi();
  syncOnboardingUi();
  subscribeToStorage((nextTasks) => {
    const nextSignature = buildTasksFingerprint(nextTasks);
    if (nextSignature === state.tasksFingerprint) return;
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
  clearDemoSessionHint();
  markRecentTask(task.id);
  dom.taskInput.value = '';
  dom.taskPriSelect.value = 'normal';
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
  clearDemoSessionHint();
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
      element?.classList.remove('closing');
      element?.classList.remove('is-pending');
      element?.removeAttribute('aria-busy');
      return;
    }
    const toggled = result.tasks.find((task) => task.id === taskId);
    const stats = buildStats(result.tasks, state.activeFilter, state.searchQuery);
    setTasks(result.tasks);
    clearDemoSessionHint();
    persistAndRender();
    if (toggled?.done) {
      playCompletionPulse();
    }
    showToast(
      toggled?.done
        ? buildCompletionPraise(stats)
        : 'Восстановлено.',
      'success',
      toggled?.done ? 'Выполнено' : 'Возвращено',
      toggled?.done ? { duration: LONG_DURATION } : undefined
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
  clearDemoSessionHint();
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
  clearDemoSessionHint();
  persistAndRender();
  showToast('Задача обновлена.', 'success', 'Сохранено');
}

export async function openTaskSheet(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  if (dom.dayModalRoot.classList.contains('show')) {
    closeDayModal(null);
  }
  const action = await openTaskModal(task);
  if (!action) return;
  if (action === 'done') {
    await toggleTask(taskId);
    return;
  }
  if (action === 'duplicate') {
    duplicateTask(taskId);
    return;
  }
  if (action === 'edit') {
    await editTask(taskId);
    return;
  }
  if (action === 'delete') {
    await deleteTask(taskId);
  }
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
  clearDemoSessionHint();
  persistAndRender();
  showToast('Архив очищен.', 'success', 'Готово');
}

export async function clearActiveTasks() {
  const activeCount = state.tasks.filter((task) => !task.done).length;
  if (!activeCount) {
    showToast('Активных задач уже нет.', 'info', 'Список');
    return;
  }

  const confirmed = await openConfirmModal({
    kicker: 'Сброс недели',
    title: 'Очистить все активные задачи?',
    text: `Будут удалены все активные задачи: ${activeCount}. Архив останется нетронутым.`,
    buttons: [
      { label: 'Отмена', value: false, className: 'ghost' },
      { label: 'Очистить активные', value: true, className: 'danger' }
    ]
  });

  if (!confirmed) return;
  const result = clearActiveTasksOp(state.tasks);
  if (!result.changed) return;
  setTasks(result.tasks);
  clearDemoSessionHint();
  persistAndRender();
  showToast('Активные задачи очищены.', 'success', 'Готово');
}

export async function clearArchiveEarlier() {
  const groups = groupArchiveTasks(state.tasks.filter((task) => task.done));
  const earlierCount = groups.earlier.length;
  if (!earlierCount) {
    showToast('В старом архиве пока нечего чистить.', 'info', 'Архив');
    return;
  }

  const confirmed = await openConfirmModal({
    kicker: 'Архив',
    title: 'Очистить старые записи?',
    text: `Будут удалены только записи из блока "Ранее": ${earlierCount}. Сегодня и вчера останутся.`,
    buttons: [
      { label: 'Отмена', value: false, className: 'ghost' },
      { label: 'Очистить старое', value: true, className: 'danger' }
    ]
  });

  if (!confirmed) return;
  const result = clearArchiveEarlierOp(state.tasks);
  if (!result.changed) return;
  setTasks(result.tasks);
  clearDemoSessionHint();
  persistAndRender();
  showToast('Старые записи архива удалены.', 'success', 'Архив');
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
    const { tasks, skippedCount, sourceCount } = await readTasksFile(file);
    const mode = await openConfirmModal({
      kicker: 'Импорт JSON',
      title: 'Как импортировать задачи?',
      text: skippedCount
        ? `Корректных задач: ${tasks.length} из ${sourceCount}. Пропущено записей: ${skippedCount}.`
        : `Найдено задач: ${tasks.length}`,
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
    clearDemoSessionHint();

    persistAndRender();
    showToast(
      skippedCount
        ? `Импорт завершён: ${tasks.length} задач, пропущено ${skippedCount}.`
        : `Импорт завершён: ${tasks.length} задач.`,
      skippedCount ? 'warning' : 'success',
      'Import'
    );
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
  clearDemoSessionHint();
  dom.taskDaySelect.value = dayId;
  persistAndRender();
  showToast('Задача перенесена.', 'success', 'Перемещено');
}

export function openDay(dayId) {
  openDayModal(dayId);
}

export function handleTaskInputChange() {
  syncAddButtonState();
}

export function handleTaskPriorityChange() {
  syncPresetUi();
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
  dom.todayBtn?.classList.add('active', 'is-flashing');
  todayCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  todayCard.classList.add('is-spotlit');
  todayCard.focus({ preventScroll: true });
  window.setTimeout(() => {
    todayCard.classList.remove('is-spotlit');
    dom.todayBtn?.classList.remove('active', 'is-flashing');
  }, 1400);
}

export function focusUrgentToday() {
  if (state.activeFilter !== 'urgent') {
    setFilter('urgent');
    syncFilterButtons('urgent');
    renderApp();
    refreshDayModal();
  }
  scrollToToday();
  showToast('Фокус на срочных задачах текущего дня.', 'info', 'Фокус');
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

export function toggleFocusMode(nextValue = null) {
  const nextMode = typeof nextValue === 'boolean' ? nextValue : !state.focusMode;
  setFocusMode(nextMode);
  try {
    localStorage.setItem(FOCUS_MODE_KEY, nextMode ? '1' : '0');
  } catch {}
  syncFocusUi();
  showToast(nextMode ? 'Включён Focus mode.' : 'Возвращён полный вид.', 'info', 'Фокус');
}

export function dismissOnboarding() {
  if (!state.showOnboarding) return;
  setShowOnboarding(false);
  try {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1');
  } catch {}
  syncOnboardingUi();
  showToast('Подсказка скрыта. При желании Focus можно включить в верхней панели.', 'info', 'Готово');
}

export function handleApplyPreset({ cat = '', pri = '' } = {}) {
  if (cat) dom.taskCatSelect.value = cat;
  if (pri) dom.taskPriSelect.value = pri;
  syncPresetUi();
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

export function closeTask(value = null) {
  closeTaskModal(value);
}

export function closeDay(value = null) {
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
  syncPresetUi();
  syncCompactUi();
  syncFocusUi();
  syncOnboardingUi();
}

export { focusTaskInput };
