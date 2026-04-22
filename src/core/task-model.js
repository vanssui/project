import { categories, priorities } from '../shared/config.js';
import { generateId } from '../shared/utils.js';
import { getCurrentDayId, isValidDay } from './date.js';

export function createTask({ title, day, cat, pri }) {
  return {
    id: generateId(),
    title,
    day: isValidDay(day) ? day : getCurrentDayId(),
    cat: categories.includes(cat) ? cat : 'Дом',
    pri: priorities.includes(pri) ? pri : 'normal',
    done: false,
    completedAt: null
  };
}

export function normalizeTask(source = {}, fallbackDay = getCurrentDayId(), index = 0) {
  const raw = typeof source === 'object' && source ? source : {};
  const title = String(raw.title || '').trim();
  if (!title) return null;

  let id = Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) {
    id = Date.now() + index + Math.floor(Math.random() * 1000);
  }

  const done = Boolean(raw.done);
  let completedAt = null;
  if (typeof raw.completedAt === 'number' && Number.isFinite(raw.completedAt) && raw.completedAt > 0) {
    completedAt = raw.completedAt;
  } else if (done) {
    completedAt = Date.now() - index;
  }

  return {
    id,
    title,
    day: isValidDay(raw.day) ? raw.day : fallbackDay,
    cat: categories.includes(raw.cat) ? raw.cat : 'Дом',
    pri: priorities.includes(raw.pri) ? raw.pri : 'normal',
    done,
    completedAt
  };
}
