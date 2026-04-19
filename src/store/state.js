export const state = {
  currentDayId: '',
  activeFilter: 'all',
  tasks: [],
  draggedTaskId: null,
  openedDayModalId: null,
  longPressTimer: 0,
  longPressTriggered: false,
  lastClockMinute: '',
  lastClockSecond: '',
  currentTheme: 'dark',
  canvasWidth: 0,
  canvasHeight: 0,
  dpr: 1,
  resizeRaf: 0,
  particles: [],
  isBusy: false
};

export function setTasks(tasks) {
  state.tasks = tasks;
}

export function setFilter(filter) {
  state.activeFilter = filter;
}
