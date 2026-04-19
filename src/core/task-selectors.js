import { daysShort } from '../shared/config.js';

export function passesFilter(task, activeFilter) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'urgent') return task.pri === 'urgent';
  return task.cat === activeFilter;
}

export function getVisibleDayTasks(tasks, dayId, activeFilter) {
  return tasks.filter((task) => task.day === dayId && !task.done && passesFilter(task, activeFilter));
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

export function getVisibleArchiveTasks(tasks, activeFilter) {
  return tasks.filter((task) => task.done && passesFilter(task, activeFilter));
}
