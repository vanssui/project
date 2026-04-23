import { categories, daysShort } from '../shared/config.js';
import { getStartOfDay, getTaskAgeDays, isSameCalendarDay, isYesterday } from './date.js';
import { compareTasksForDay, passesTaskView } from './task-selectors.js';

function getDayStamp(timestampOrDate) {
  const day = getStartOfDay(timestampOrDate instanceof Date ? timestampOrDate : new Date(timestampOrDate));
  return day.getTime();
}

function buildCompletionMomentum(tasks, now = new Date()) {
  const completedTasks = tasks.filter((task) => task.done && typeof task.completedAt === 'number' && task.completedAt > 0);
  const completedToday = completedTasks.filter((task) => isSameCalendarDay(task.completedAt, now)).length;
  const completedYesterday = completedTasks.filter((task) => isYesterday(task.completedAt, now)).length;
  const completedDaySet = new Set(completedTasks.map((task) => getDayStamp(task.completedAt)));

  let cursor = null;
  if (completedToday) {
    cursor = getStartOfDay(now);
  } else if (completedYesterday) {
    const yesterday = getStartOfDay(now);
    yesterday.setDate(yesterday.getDate() - 1);
    cursor = yesterday;
  }

  let streakDays = 0;
  while (cursor && completedDaySet.has(cursor.getTime())) {
    streakDays += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return {
    completedToday,
    completedYesterday,
    streakDays
  };
}

function getRhythmLevel(momentum) {
  const score = (momentum.streakDays * 2) + (momentum.completedToday * 2) + (momentum.completedYesterday ? 1 : 0);
  if (score >= 14) return { label: 'Пиковый ритм', tone: 'level-max' };
  if (score >= 8) return { label: 'Сильный ход', tone: 'level-high' };
  if (score >= 4) return { label: 'Ровный ход', tone: 'level-mid' };
  if (score >= 1) return { label: 'Разгон', tone: 'level-low' };
  return { label: 'Старт', tone: 'level-low' };
}

function buildAttentionInsights(tasks, momentum) {
  const activeTasks = tasks
    .filter((task) => !task.done)
    .sort(compareTasksForDay);

  const staleTasks = activeTasks.filter((task) => getTaskAgeDays(task.createdAt) >= 3);
  const nextFocusTask = activeTasks[0] || null;

  return {
    rhythm: getRhythmLevel(momentum),
    nextFocusTask,
    staleCount: staleTasks.length,
    stalestTask: staleTasks[0] || null
  };
}

export function buildStats(tasks, activeFilter, searchQuery = '') {
  const byCat = Object.fromEntries(categories.map((cat) => [cat, { total: 0, done: 0 }]));
  const activeByDay = Object.fromEntries(daysShort.map((day) => [day, []]));
  const visibleActiveByDay = Object.fromEntries(daysShort.map((day) => [day, []]));
  const archiveVisible = [];
  const momentum = buildCompletionMomentum(tasks);
  const insights = buildAttentionInsights(tasks, momentum);
  let done = 0;

  for (const task of tasks) {
    if (byCat[task.cat]) {
      byCat[task.cat].total += 1;
      if (task.done) byCat[task.cat].done += 1;
    }

    if (task.done) {
      done += 1;
      if (passesTaskView(task, activeFilter, searchQuery)) archiveVisible.push(task);
      continue;
    }

    if (activeByDay[task.day]) {
      activeByDay[task.day].push(task);
      if (passesTaskView(task, activeFilter, searchQuery)) {
        visibleActiveByDay[task.day].push(task);
      }
    }
  }

  daysShort.forEach((day) => {
    activeByDay[day].sort(compareTasksForDay);
    visibleActiveByDay[day].sort(compareTasksForDay);
  });

  return {
    total: tasks.length,
    done,
    byCat,
    activeByDay,
    visibleActiveByDay,
    archiveVisible,
    momentum,
    insights
  };
}
