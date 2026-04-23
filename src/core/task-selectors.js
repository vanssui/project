import { daysShort } from '../shared/config.js';
import { normalizeSearchQuery } from '../shared/utils.js';
import { getTaskAgeDays } from './date.js';

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

export function compareTasksForDay(left, right) {
  const leftUrgent = left.pri === 'urgent' ? 1 : 0;
  const rightUrgent = right.pri === 'urgent' ? 1 : 0;
  if (leftUrgent !== rightUrgent) return rightUrgent - leftUrgent;

  const leftAge = getTaskAgeDays(left.createdAt);
  const rightAge = getTaskAgeDays(right.createdAt);
  if (leftAge !== rightAge) return rightAge - leftAge;

  const leftCreatedAt = typeof left.createdAt === 'number' ? left.createdAt : 0;
  const rightCreatedAt = typeof right.createdAt === 'number' ? right.createdAt : 0;
  if (leftCreatedAt !== rightCreatedAt) return leftCreatedAt - rightCreatedAt;

  return Number(left.id) - Number(right.id);
}

export function getVisibleDayTasks(tasks, dayId, activeFilter, searchQuery = '') {
  return tasks
    .filter((task) => task.day === dayId && !task.done && passesTaskView(task, activeFilter, searchQuery))
    .sort(compareTasksForDay);
}

export function getActiveTasksByDay(tasks) {
  const result = Object.fromEntries(daysShort.map((day) => [day, []]));
  for (const task of tasks) {
    if (!task.done && result[task.day]) {
      result[task.day].push(task);
    }
  }
  daysShort.forEach((day) => result[day].sort(compareTasksForDay));
  return result;
}
