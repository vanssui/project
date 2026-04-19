import { dom } from './dom.js';
import {
  activateFocusTrap,
  deactivateFocusTrap,
  handleFocusTrap as handleFocusTrapInternal,
  rememberFocus,
  restoreFocus
} from './focus-trap.js';
import { setText } from '../shared/utils.js';
import { getDayName } from '../core/date.js';

let confirmResolver = null;
let editResolver = null;
let previewResolver = null;
let dayResolver = null;
let adapters = {
  getDayTasks: () => [],
  createTaskElement: () => document.createElement('div')
};
let openedDayId = null;

export function setModalAdapters(nextAdapters) {
  adapters = { ...adapters, ...nextAdapters };
}

function showModal(root) {
  root.classList.add('show');
  root.setAttribute('aria-hidden', 'false');
  activateFocusTrap(root);
}

function hideModal(root) {
  root.classList.remove('show');
  root.setAttribute('aria-hidden', 'true');
  deactivateFocusTrap(root);
}

export function handleFocusTrap(event) {
  handleFocusTrapInternal(event);
}

export function openConfirmModal(config) {
  if (confirmResolver) return Promise.resolve(null);

  return new Promise((resolve) => {
    rememberFocus();
    confirmResolver = resolve;

    setText(dom.modalKicker, config?.kicker || 'Подтверждение');
    setText(dom.modalTitle, config?.title || 'Подтверждение');
    setText(dom.modalText, config?.text || '');
    dom.modalActions.replaceChildren();

    const buttons = Array.isArray(config?.buttons) ? config.buttons : [];
    for (const item of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `modal-btn ${item.className || 'ghost'}`;
      button.textContent = item.label || 'OK';
      button.addEventListener('click', () => closeConfirmModal(item.value));
      dom.modalActions.appendChild(button);
    }

    showModal(dom.modalRoot);
    const primary = dom.modalActions.querySelector('.primary,.danger,.modal-btn');
    setTimeout(() => primary?.focus(), 20);
  });
}

export function closeConfirmModal(value = null) {
  hideModal(dom.modalRoot);
  const resolver = confirmResolver;
  confirmResolver = null;
  setTimeout(() => dom.modalActions.replaceChildren(), 120);
  restoreFocus();
  resolver?.(value);
}

export function openEditModal(task) {
  if (editResolver) return Promise.resolve(null);

  return new Promise((resolve) => {
    rememberFocus();
    editResolver = resolve;
    dom.editTaskInput.value = task.title || '';
    showModal(dom.editModalRoot);
    setTimeout(() => {
      dom.editTaskInput.focus();
      dom.editTaskInput.select();
    }, 20);
  });
}

export function submitEditModal() {
  closeEditModal(String(dom.editTaskInput.value || ''));
}

export function closeEditModal(value = null) {
  hideModal(dom.editModalRoot);
  const resolver = editResolver;
  editResolver = null;
  restoreFocus();
  resolver?.(value);
}

export function openPreviewModal(title) {
  if (previewResolver) return Promise.resolve(null);

  return new Promise((resolve) => {
    rememberFocus();
    previewResolver = resolve;
    setText(dom.previewModalText, title || '');
    showModal(dom.previewModalRoot);
    setTimeout(() => dom.previewCloseBtn.focus(), 20);
  });
}

export function closePreviewModal(value = null) {
  hideModal(dom.previewModalRoot);
  const resolver = previewResolver;
  previewResolver = null;
  restoreFocus();
  resolver?.(value);
}

function renderDayModal(dayId) {
  const tasks = adapters.getDayTasks(dayId);
  setText(dom.dayModalTitle, getDayName(dayId).toUpperCase());
  setText(dom.dayModalCountChip, `${tasks.length} задач`);
  dom.dayModalList.replaceChildren();

  if (!tasks.length) {
    dom.dayModalList.classList.add('is-hidden');
    dom.dayModalEmpty.classList.remove('is-hidden');
    return;
  }

  dom.dayModalList.classList.remove('is-hidden');
  dom.dayModalEmpty.classList.add('is-hidden');

  const fragment = document.createDocumentFragment();
  for (const task of tasks) {
    fragment.appendChild(adapters.createTaskElement(task, { isArchive: false }));
  }
  dom.dayModalList.appendChild(fragment);
}

export function openDayModal(dayId) {
  if (dayResolver) return Promise.resolve(null);

  return new Promise((resolve) => {
    rememberFocus();
    dayResolver = resolve;
    openedDayId = dayId;
    renderDayModal(dayId);
    showModal(dom.dayModalRoot);
    setTimeout(() => dom.dayModalCloseBtn.focus(), 20);
  });
}

export function refreshDayModal() {
  if (!openedDayId || !dom.dayModalRoot.classList.contains('show')) return;
  renderDayModal(openedDayId);
}

export function closeDayModal(value = null) {
  hideModal(dom.dayModalRoot);
  const resolver = dayResolver;
  dayResolver = null;
  openedDayId = null;
  restoreFocus();
  resolver?.(value);
}
