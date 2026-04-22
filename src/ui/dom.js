export const dom = {
  body: document.body,
  canvas: document.getElementById('bg-canvas'),
  taskForm: document.getElementById('taskForm'),
  taskInput: document.getElementById('taskName'),
  taskDaySelect: document.getElementById('taskDay'),
  taskCatSelect: document.getElementById('taskCat'),
  taskPriSelect: document.getElementById('taskPri'),
  addTaskBtn: document.getElementById('addTaskBtn'),
  todayBtn: document.getElementById('todayBtn'),
  compactToggleBtn: document.getElementById('compactToggleBtn'),
  taskSearchInput: document.getElementById('taskSearch'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  exportBtn: document.getElementById('exportBtn'),
  clearArchiveBtn: document.getElementById('clearArchiveBtn'),
  archiveCount: document.getElementById('archiveCount'),
  jsonFileInput: document.getElementById('jsonFileInput'),
  telegramBtn: document.getElementById('telegramBtn'),
  toastWrap: document.getElementById('toastWrap'),
  grid: document.getElementById('grid'),
  archive: document.getElementById('archive'),
  currentDateEl: document.getElementById('currentDate'),
  heroClock: document.getElementById('heroClock'),
  weekProgressValue: document.getElementById('weekProgressValue'),
  modalRoot: document.getElementById('modalRoot'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  modalKicker: document.getElementById('modalKicker'),
  modalTitle: document.getElementById('modalTitle'),
  modalText: document.getElementById('modalText'),
  modalActions: document.getElementById('modalActions'),
  editModalRoot: document.getElementById('editModalRoot'),
  editModalBackdrop: document.getElementById('editModalBackdrop'),
  editTaskInput: document.getElementById('editTaskInput'),
  editCancelBtn: document.getElementById('editCancelBtn'),
  editSaveBtn: document.getElementById('editSaveBtn'),
  previewModalRoot: document.getElementById('previewModalRoot'),
  previewModalBackdrop: document.getElementById('previewModalBackdrop'),
  previewModalText: document.getElementById('previewModalText'),
  previewCloseBtn: document.getElementById('previewCloseBtn'),
  dayModalRoot: document.getElementById('dayModalRoot'),
  dayModalBackdrop: document.getElementById('dayModalBackdrop'),
  dayModalTitle: document.getElementById('dayModalTitle'),
  dayModalCountChip: document.getElementById('dayModalCountChip'),
  dayModalList: document.getElementById('dayModalList'),
  dayModalEmpty: document.getElementById('dayModalEmpty'),
  dayModalCloseBtn: document.getElementById('dayModalCloseBtn'),
  themeToggle: document.getElementById('themeToggle'),
  themeLabel: document.getElementById('themeLabel'),
  filterButtons: Array.from(document.querySelectorAll('.filter-btn')),
  presetButtons: Array.from(document.querySelectorAll('.preset-btn')),
  systemThemeQuery: window.matchMedia('(prefers-color-scheme: light)')
};

export const ringMap = {
  'Дом': {
    ring: document.querySelector('#ring-home .ring-active'),
    value: document.getElementById('val-home')
  },
  'Работа': {
    ring: document.querySelector('#ring-work .ring-active'),
    value: document.getElementById('val-work')
  },
  'Личное': {
    ring: document.querySelector('#ring-personal .ring-active'),
    value: document.getElementById('val-personal')
  }
};
