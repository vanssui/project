import { formatClock, formatHeroDate, getCurrentDayId } from '../core/date.js';
import { state } from '../store/state.js';
import { dom } from '../ui/dom.js';
import { bindEvents } from '../ui/events.js';
import { createTaskElement, setTaskViewHandlers } from '../ui/task-view.js';
import { setModalAdapters } from '../ui/modals.js';
import { setRenderCallbacks } from '../ui/render.js';
import { applyTheme, getPreferredTheme } from '../services/theme.js';
import { animateBackground, bindBackgroundLifecycle, resizeCanvas } from '../services/background.js';
import {
  addTask,
  applyFilter,
  cancelLongPress,
  clearArchive,
  closeConfirm,
  closeDay,
  closeEdit,
  closePreview,
  clearSearch,
  deleteTask,
  duplicateTask,
  editTask,
  exportTasks,
  focusTaskInput,
  getDayTasks,
  handleApplyPreset,
  handleOpenTelegram,
  handleSearchChange,
  handleTaskInputChange,
  handleSystemThemeChange,
  handleThemeChange,
  importFromFile,
  initializeState,
  moveTask,
  openDay,
  previewTask,
  runInitialRender,
  scrollToToday,
  startLongPress,
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
    onToggle: toggleTask,
    onEdit: editTask,
    onDelete: deleteTask,
    onPreview: previewTask,
    onDuplicate: duplicateTask,
    onMove: moveTask,
    onLongPressStart: startLongPress,
    onLongPressCancel: cancelLongPress
  });

  setModalAdapters({
    getDayTasks,
    createTaskElement
  });

  setRenderCallbacks({
    onOpenDay: openDay
  });

  bindEvents({
    onAddTask: addTask,
    onExport: exportTasks,
    onClearArchive: clearArchive,
    onOpenTelegram: handleOpenTelegram,
    onCloseConfirm: closeConfirm,
    onCloseEdit: closeEdit,
    onClosePreview: closePreview,
    onCloseDay: closeDay,
    onSubmitEdit: submitEdit,
    onSetFilter: applyFilter,
    onImport: importFromFile,
    onTaskInputChange: handleTaskInputChange,
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
