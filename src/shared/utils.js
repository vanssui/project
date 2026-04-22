import { MAX_TITLE_LENGTH } from './config.js';

let idSeed = 0;

export function setText(element, value) {
  if (!element) return;
  const next = String(value);
  if (element.textContent !== next) {
    element.textContent = next;
  }
}

export function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function clampTitle(value) {
  return normalizeSpaces(value).slice(0, MAX_TITLE_LENGTH);
}

export function normalizeSearchQuery(value) {
  return normalizeSpaces(value).toLocaleLowerCase('ru-RU');
}

export function validateTitle(raw) {
  const title = clampTitle(raw);
  return title ? { ok: true, value: title } : { ok: false, reason: 'empty' };
}

export function generateId() {
  idSeed = (idSeed + 1) % 1000000;
  return Date.now() * 1000 + idSeed;
}

export function noop() {}

export function pluralizeTasks(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'задача';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'задачи';
  return 'задач';
}

export function requestIdle(callback) {
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, { timeout: 500 });
  }
  return window.setTimeout(callback, 32);
}
