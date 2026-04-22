import { formatClock, formatHeroDate, getCurrentDayId } from '../core/date.js';
import { dayNames, daysShort } from '../shared/config.js';
import { state } from '../store/state.js';
import { dom } from '../ui/dom.js';
import { bindEvents } from '../ui/events.js';
import { createTaskElement, setTaskViewHandlers } from '../ui/task-view.js';
import { setModalAdapters } from '../ui/modals.js';
import { setRenderCallbacks } from '../ui/render.js';
import { applyTheme, getPreferredTheme } from '../services/theme.js';
import { applyAmbientQuote } from '../services/ambient-quote.js';
import { animateBackground, bindBackgroundLifecycle, resizeCanvas } from '../services/background.js';
import {
  addTask,
  applyFilter,
  clearArchive,
  clearArchiveEarlier,
  closeConfirm,
  closeDay,
  closeEdit,
  closeTask,
  clearSearch,
  deleteTask,
  editTask,
  exportTasks,
  focusTaskInput,
  getDayTasks,
  handleApplyPreset,
  handleOpenTelegram,
  handleSearchChange,
  handleTaskPriorityChange,
  handleTaskInputChange,
  handleSystemThemeChange,
  handleThemeChange,
  importFromFile,
  initializeState,
  moveTask,
  openDay,
  openTaskSheet,
  runInitialRender,
  scrollToToday,
  focusUrgentToday,
  submitEdit,
  toggleCompactMode,
  toggleTask
} from '../store/actions.js';

let clockMain = null;
let clockSeconds = null;
let clockTimerId = 0;

function ensureClockNodes() {
  if (!clockMain || !clockSeconds) {
    if (!dom.heroClock.querySelector('.clock-main')) {
      dom.heroClock.innerHTML = '<span class="clock-main">00:00</span><span class="clock-seconds">:00</span>';
    }
    clockMain = dom.heroClock.querySelector('.clock-main');
    clockSeconds = dom.heroClock.querySelector('.clock-seconds');
  }
}

function updateDate(setSelect = false) {
  const now = new Date();
  dom.currentDateEl.textContent = formatHeroDate(now);
  state.currentDayId = getCurrentDayId(now);
  const dayIndex = daysShort.indexOf(state.currentDayId);
  const todayLabel = dayIndex >= 0 ? dayNames[dayIndex] : '';
  if (dom.todayBtn) {
    dom.todayBtn.textContent = todayLabel ? `Сегодня · ${todayLabel}` : 'Сегодня';
    dom.todayBtn.setAttribute('aria-label', todayLabel ? `Перейти к текущему дню: ${todayLabel}` : 'Перейти к текущему дню');
  }
  if (setSelect) {
    dom.taskDaySelect.value = state.currentDayId;
  }
}

function updateClock() {
  ensureClockNodes();
  const now = new Date();
  const { minuteText, secondText } = formatClock(now);
  if (state.lastClockMinute !== minuteText) {
    state.lastClockMinute = minuteText;
    clockMain.textContent = minuteText;
  }
  if (state.lastClockSecond !== secondText) {
    state.lastClockSecond = secondText;
    clockSeconds.textContent = secondText;
  }
}

function startClock() {
  if (clockTimerId) {
    clearInterval(clockTimerId);
  }
  clockTimerId = window.setInterval(() => {
    updateDate(false);
    updateClock();
  }, 1000);
}

function initHandlers() {
  setTaskViewHandlers({
    onOpen: openTaskSheet,
    onToggle: toggleTask,
    onEdit: editTask,
    onDelete: deleteTask,
    onMove: moveTask
  });

  setModalAdapters({
    getDayTasks,
    createTaskElement
  });

  setRenderCallbacks({
    onOpenDay: openDay,
    onFocusToday: scrollToToday,
    onFocusUrgentToday: focusUrgentToday
  });

  bindEvents({
    onAddTask: addTask,
    onExport: exportTasks,
    onClearArchive: clearArchive,
    onClearArchiveEarlier: clearArchiveEarlier,
    onOpenTelegram: handleOpenTelegram,
    onCloseConfirm: closeConfirm,
    onCloseEdit: closeEdit,
    onCloseTask: closeTask,
    onCloseDay: closeDay,
    onSubmitEdit: submitEdit,
    onSetFilter: applyFilter,
    onImport: importFromFile,
    onTaskInputChange: handleTaskInputChange,
    onTaskPriorityChange: handleTaskPriorityChange,
    onSearchChange: handleSearchChange,
    onClearSearch: clearSearch,
    onScrollToToday: scrollToToday,
    onToggleCompact: toggleCompactMode,
    onApplyPreset: handleApplyPreset,
    onThemeChange: (theme) => handleThemeChange(theme, true),
    onSystemThemeChange: handleSystemThemeChange,
    onDropTask: moveTask
  });
}

function initTheme() {
  applyTheme(getPreferredTheme(dom.systemThemeQuery), {
    themeToggle: dom.themeToggle,
    themeLabel: dom.themeLabel,
    stateRef: state,
    persist: false
  });
}

function init() {
  initializeState();
  updateDate(true);
  updateClock();
  initTheme();
  applyAmbientQuote(dom.ambientQuote);
  initHandlers();
  runInitialRender();
  focusTaskInput();

  dom.body.classList.remove('preload');
  requestAnimationFrame(() => {
    dom.body.classList.add('is-ready');
    resizeCanvas(dom.canvas);
    animateBackground();
  });
  bindBackgroundLifecycle(dom.canvas);
  startClock();
}

init();
