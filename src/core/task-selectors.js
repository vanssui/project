import { daysShort } from '../shared/config.js';
import { normalizeSearchQuery } from '../shared/utils.js';

export function passesFilter(task, activeFilter) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'urgent') return task.pri === 'urgent';
  return task.cat === activeFilter;
}

export function matchesSearch(task, searchQuery) {
  if (!searchQuery) return true;
  return normalizeSearchQuery(task.title).includes(searchQuery);
}

export function passesTaskView(task, activeFilter, searchQuery) {
  return passesFilter(task, activeFilter) && matchesSearch(task, searchQuery);
}

export function getVisibleDayTasks(tasks, dayId, activeFilter, searchQuery = '') {
  return tasks.filter((task) => task.day === dayId && !task.done && passesTaskView(task, activeFilter, searchQuery));
}

export function getActiveTasksByDay(tasks) {
  const result = Object.fromEntries(daysShort.map((day) => [day, []]));
  for (const task of tasks) {
    if (!task.done && result[task.day]) {
      result[task.day].push(task);
    }
  }
  return result;
}

export function getVisibleArchiveTasks(tasks, activeFilter, searchQuery = '') {
  return tasks.filter((task) => task.done && passesTaskView(task, activeFilter, searchQuery));
}
