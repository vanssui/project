import { dayNamesShort, daysShort } from '../shared/config.js';

export function getCurrentDayId(date = new Date()) {
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[date.getDay()];
}

export function getDayName(dayId) {
  return dayNamesShort[dayId] || 'День';
}

export function formatHeroDate(date = new Date()) {
  const months = ['ЯНВАРЯ', 'ФЕВРАЛЯ', 'МАРТА', 'АПРЕЛЯ', 'МАЯ', 'ИЮНЯ', 'ИЮЛЯ', 'АВГУСТА', 'СЕНТЯБРЯ', 'ОКТЯБРЯ', 'НОЯБРЯ', 'ДЕКАБРЯ'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} Г.`;
}

export function formatClock(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return {
    minuteText: `${hh}:${mm}`,
    secondText: `:${ss}`
  };
}

export function isValidDay(day) {
  return daysShort.includes(day);
}

export function isSameCalendarDay(timestamp, baseDate = new Date()) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  return date.getFullYear() === baseDate.getFullYear()
    && date.getMonth() === baseDate.getMonth()
    && date.getDate() === baseDate.getDate();
}

export function isYesterday(timestamp, baseDate = new Date()) {
  if (!timestamp) return false;
  const ref = new Date(baseDate);
  ref.setHours(0, 0, 0, 0);
  ref.setDate(ref.getDate() - 1);
  return isSameCalendarDay(timestamp, ref);
}

export function formatArchiveDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long'
  });
}

export function formatArchiveTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
