export const state = {
  currentDayId: '',
  activeFilter: 'all',
  searchQuery: '',
  tasks: [],
  tasksFingerprint: '',
  draggedTaskId: null,
  lastClockMinute: '',
  lastClockSecond: '',
  currentTheme: 'dark',
  compactMode: false,
  recentTaskId: null,
  seededDemoSession: false,
  focusMode: false,
  showOnboarding: false
};

export function buildTasksFingerprint(tasks) {
  return tasks
    .map((task) => [
      task.id,
      task.title,
      task.day,
      task.cat,
      task.pri,
      task.done ? 1 : 0,
      task.completedAt || 0,
      task.createdAt || 0
    ].join('|'))
    .join('||');
}

export function setTasks(tasks) {
  state.tasks = tasks;
  state.tasksFingerprint = buildTasksFingerprint(tasks);
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

export function setFocusMode(focusMode) {
  state.focusMode = focusMode;
}

export function setShowOnboarding(showOnboarding) {
  state.showOnboarding = showOnboarding;
}
