export const state = {
  currentDayId: '',
  activeFilter: 'all',
  searchQuery: '',
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
  isBusy: false,
  compactMode: false,
  recentTaskId: null
};

export function setTasks(tasks) {
  state.tasks = tasks;
}

export function setFilter(filter) {
  state.activeFilter = filter;
}

export function setSearchQuery(query) {
  state.searchQuery = query;
}

export function setCompactMode(compactMode) {
  state.compactMode = compactMode;
}
