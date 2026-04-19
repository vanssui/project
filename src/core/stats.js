import { categories, daysShort } from '../shared/config.js';
import { passesFilter } from './task-selectors.js';

export function buildStats(tasks, activeFilter) {
  const byCat = Object.fromEntries(categories.map((cat) => [cat, { total: 0, done: 0 }]));
  const activeByDay = Object.fromEntries(daysShort.map((day) => [day, []]));
  const visibleActiveByDay = Object.fromEntries(daysShort.map((day) => [day, []]));
  const archiveVisible = [];
  let done = 0;

  for (const task of tasks) {
    if (byCat[task.cat]) {
      byCat[task.cat].total += 1;
      if (task.done) byCat[task.cat].done += 1;
    }

    if (task.done) {
      done += 1;
      if (passesFilter(task, activeFilter)) archiveVisible.push(task);
      continue;
    }

    if (activeByDay[task.day]) {
      activeByDay[task.day].push(task);
      if (passesFilter(task, activeFilter)) {
        visibleActiveByDay[task.day].push(task);
      }
    }
  }

  return {
    total: tasks.length,
    done,
    byCat,
    activeByDay,
    visibleActiveByDay,
    archiveVisible
  };
}
