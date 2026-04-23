import { formatArchiveDate, formatArchiveTime, isSameCalendarDay, isYesterday } from './date.js';

export function sortArchiveTasks(tasks) {
  return [...tasks].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
}

export function groupArchiveTasks(tasks, now = new Date()) {
  const groups = {
    today: [],
    yesterday: [],
    earlier: []
  };

  for (const task of tasks) {
    const ts = typeof task.completedAt === 'number' ? task.completedAt : 0;
    if (isSameCalendarDay(ts, now)) {
      groups.today.push(task);
    } else if (isYesterday(ts, now)) {
      groups.yesterday.push(task);
    } else {
      groups.earlier.push(task);
    }
  }

  return groups;
}

export function getArchiveMeta(task) {
  return {
    date: formatArchiveDate(task.completedAt),
    time: formatArchiveTime(task.completedAt)
  };
}
