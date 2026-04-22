export const STORAGE_KEY = 'vt_v_final_ultra_v6_modular';
export const THEME_KEY = 'vt_theme';
export const COMPACT_MODE_KEY = 'vt_compact_mode';
export const PREVIEW_LIMIT = 4;
export const RING_RADIUS = 34;
export const RING_CIRC = 2 * Math.PI * RING_RADIUS;
export const MAX_TITLE_LENGTH = 140;
export const IMPORT_LIMIT = 2000;
export const TELEGRAM_URL = 'https://t.me/wuvan';
export const SAVE_DELAY = 180;
export const LONG_PRESS_MS = 550;

export const daysShort = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const dayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
export const dayNamesShort = {
  mon: 'Понедельник',
  tue: 'Вторник',
  wed: 'Среда',
  thu: 'Четверг',
  fri: 'Пятница',
  sat: 'Суббота',
  sun: 'Воскресенье'
};

export const categories = ['Дом', 'Работа', 'Личное'];
export const priorities = ['normal', 'urgent'];

export const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');
