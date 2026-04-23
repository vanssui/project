import { categories, DEMO_SEED_KEY, daysShort, priorities } from '../shared/config.js';
import { generateId } from '../shared/utils.js';
import { getCurrentDayId, getStartOfDay, isValidDay } from '../core/date.js';

function getRelativeDayId(offset, baseDate = new Date()) {
  const currentDayId = getCurrentDayId(baseDate);
  const currentIndex = daysShort.indexOf(currentDayId);
  if (currentIndex < 0) return daysShort[0];
  return daysShort[(currentIndex + offset + daysShort.length * 2) % daysShort.length];
}

function getRelativeTimestamp(dayOffset, hours, minutes = 0, baseDate = new Date()) {
  const point = getStartOfDay(baseDate);
  point.setDate(point.getDate() + dayOffset);
  point.setHours(hours, minutes, 0, 0);
  return point.getTime();
}

function createSeedTask({ title, dayOffset, cat, pri = 'normal', createdDaysAgo = 0, done = false, completedDayOffset = 0 }, baseDate) {
  const safeCategory = categories.includes(cat) ? cat : 'Дом';
  const safePriority = priorities.includes(pri) ? pri : 'normal';
  const day = getRelativeDayId(dayOffset, baseDate);
  const createdAt = getRelativeTimestamp(-Math.max(createdDaysAgo, 0), 9, 0, baseDate);
  const completedAt = done ? getRelativeTimestamp(completedDayOffset, 20, 15, baseDate) : null;

  return {
    id: generateId(),
    title,
    day: isValidDay(day) ? day : getCurrentDayId(baseDate),
    cat: safeCategory,
    pri: safePriority,
    done,
    completedAt,
    createdAt
  };
}

export function hasSeededDemoBefore() {
  try {
    return localStorage.getItem(DEMO_SEED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markDemoSeedUsed() {
  try {
    localStorage.setItem(DEMO_SEED_KEY, '1');
  } catch {}
}

export function createDemoTasks(baseDate = new Date()) {
  return [
    createSeedTask({ title: 'Собрать важные задачи недели', dayOffset: 0, cat: 'Работа', createdDaysAgo: 0 }, baseDate),
    createSeedTask({ title: 'Проверить домашние покупки', dayOffset: 1, cat: 'Дом', createdDaysAgo: 1 }, baseDate),
    createSeedTask({ title: 'Запланировать личное окно без шума', dayOffset: 2, cat: 'Личное', createdDaysAgo: 1 }, baseDate),
    createSeedTask({ title: 'Отправить одно срочное письмо', dayOffset: 0, cat: 'Работа', pri: 'urgent', createdDaysAgo: 2 }, baseDate),
    createSeedTask({ title: 'Подготовить семейный список на выходные', dayOffset: 3, cat: 'Дом', createdDaysAgo: 3 }, baseDate),
    createSeedTask({ title: 'Закрыть маленькую личную задачу', dayOffset: -1, cat: 'Личное', done: true, completedDayOffset: -1, createdDaysAgo: 2 }, baseDate),
    createSeedTask({ title: 'Разобрать один рабочий хвост', dayOffset: -2, cat: 'Работа', done: true, completedDayOffset: -2, createdDaysAgo: 4 }, baseDate),
    createSeedTask({ title: 'Сделать короткий домашний чек', dayOffset: 0, cat: 'Дом', done: true, completedDayOffset: 0, createdDaysAgo: 1 }, baseDate)
  ];
}
