import { categories, priorities } from '../shared/config.js';
import { generateId } from '../shared/utils.js';
import { getCurrentDayId, isValidDay } from './date.js';

function inferCreatedAt(rawCreatedAt, id, fallback = Date.now()) {
  if (typeof rawCreatedAt === 'number' && Number.isFinite(rawCreatedAt) && rawCreatedAt > 0) {
    return rawCreatedAt;
  }

  const derivedFromId = Math.floor(Number(id) / 1000);
  if (Number.isFinite(derivedFromId) && derivedFromId > 946684800000 && derivedFromId < Date.now() + 86400000) {
    return derivedFromId;
  }

  return fallback;
}

export function createTask({ title, day, cat, pri }) {
  const id = generateId();
  return {
    id,
    title,
    day: isValidDay(day) ? day : getCurrentDayId(),
    cat: categories.includes(cat) ? cat : 'Дом',
    pri: priorities.includes(pri) ? pri : 'normal',
    done: false,
    completedAt: null,
    createdAt: inferCreatedAt(null, id)
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
  const createdAt = inferCreatedAt(raw.createdAt, id, completedAt || Date.now() - index);

  return {
    id,
    title,
    day: isValidDay(raw.day) ? raw.day : fallbackDay,
    cat: categories.includes(raw.cat) ? raw.cat : 'Дом',
    pri: priorities.includes(raw.pri) ? raw.pri : 'normal',
    done,
    completedAt,
    createdAt
  };
}
