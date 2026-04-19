import { dom } from './dom.js';

const MAX_STACK = 3;
const DURATION = 2600;
const pool = new Map();

function makeKey(type, message) {
  return `${type || 'info'}::${String(message || '')}`;
}

function hideToast(key, immediate = false) {
  const item = pool.get(key);
  if (!item) return;

  if (immediate) {
    item.el.remove();
    pool.delete(key);
    return;
  }

  item.el.classList.add('hide');
  item.el.addEventListener('transitionend', () => {
    item.el.remove();
    pool.delete(key);
  }, { once: true });
}

export function showToast(message, type = 'info', title = '') {
  const labels = {
    success: title || 'Успешно',
    error: title || 'Ошибка',
    info: title || 'Информация',
    warning: title || 'Внимание'
  };

  const key = makeKey(type, message);
  if (pool.has(key)) {
    const item = pool.get(key);
    item.count += 1;
    item.text.textContent = `${String(message)} ×${item.count}`;
    clearTimeout(item.timer);
    item.timer = setTimeout(() => hideToast(key), DURATION);
    return;
  }

  while (dom.toastWrap.children.length >= MAX_STACK) {
    const first = dom.toastWrap.firstElementChild;
    const firstKey = [...pool.keys()].find((currentKey) => pool.get(currentKey).el === first);
    if (!firstKey) break;
    hideToast(firstKey, true);
  }

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');

  const head = document.createElement('div');
  head.className = 'toast-title';
  head.textContent = labels[type] || labels.info;

  const text = document.createElement('div');
  text.className = 'toast-text';
  text.textContent = String(message || '');

  const closeButton = document.createElement('button');
  closeButton.className = 'toast-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Закрыть');
  closeButton.textContent = '×';

  el.append(head, text, closeButton);
  dom.toastWrap.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));

  const timer = setTimeout(() => hideToast(key), DURATION);
  closeButton.addEventListener('click', () => {
    clearTimeout(timer);
    hideToast(key);
  });

  pool.set(key, {
    el,
    text,
    timer,
    count: 1
  });
}
