import { dom } from './dom.js';
import {
  activateFocusTrap,
  deactivateFocusTrap,
  handleFocusTrap as handleFocusTrapInternal,
  rememberFocus,
  restoreFocus
} from './focus-trap.js';
import { setText } from '../shared/utils.js';
import { formatTaskAgeLabel, getDayName } from '../core/date.js';
import { state } from '../store/state.js';

let confirmResolver = null;
let editResolver = null;
let taskResolver = null;
let dayResolver = null;
let manualOpen = false;
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

function createTaskMetaChip(text, className = '') {
  const chip = document.createElement('span');
  chip.className = `task-modal-chip ${className}`.trim();
  chip.textContent = text;
  return chip;
}

export function openTaskModal(task) {
  if (taskResolver) return Promise.resolve(null);

  return new Promise((resolve) => {
    rememberFocus();
    taskResolver = resolve;
    setText(dom.taskModalKicker, 'Задача');
    setText(dom.taskModalTitle, task?.title || 'Карточка задачи');
    setText(dom.taskModalText, 'Выбери, что сделать с этой задачей.');

    dom.taskModalMeta.replaceChildren(
      createTaskMetaChip(getDayName(task?.day), 'day'),
      createTaskMetaChip(task?.cat || 'Без категории', 'cat'),
      createTaskMetaChip(formatTaskAgeLabel(task?.createdAt), 'age'),
      createTaskMetaChip(task?.pri === 'urgent' ? 'Срочно' : 'Обычный приоритет', task?.pri === 'urgent' ? 'urgent' : '')
    );

    dom.taskModalActions.replaceChildren();

    const actions = [
      { label: 'Закрыть', value: null, className: 'ghost' },
      { label: 'Повторить', value: 'duplicate', className: 'ghost' },
      { label: 'Редактировать', value: 'edit', className: 'ghost' },
      { label: 'Удалить', value: 'delete', className: 'danger' },
      { label: 'Выполнено', value: 'done', className: 'primary' }
    ];

    actions.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `modal-btn ${item.className}`;
      button.textContent = item.label;
      button.addEventListener('click', () => closeTaskModal(item.value));
      dom.taskModalActions.appendChild(button);
    });

    showModal(dom.taskModalRoot);
    const primary = dom.taskModalActions.querySelector('.primary') || dom.taskModalActions.querySelector('.modal-btn');
    setTimeout(() => primary?.focus(), 20);
  });
}

export function closeTaskModal(value = null) {
  hideModal(dom.taskModalRoot);
  const resolver = taskResolver;
  taskResolver = null;
  setTimeout(() => {
    dom.taskModalMeta.replaceChildren();
    dom.taskModalActions.replaceChildren();
  }, 120);
  restoreFocus();
  resolver?.(value);
}

function renderDayModal(dayId) {
  const tasks = adapters.getDayTasks(dayId);
  setText(dom.dayModalTitle, getDayName(dayId).toUpperCase());
  setText(dom.dayModalCountChip, `${tasks.length} задач`);
  dom.dayModalList.replaceChildren();

  if (!tasks.length) {
    const emptyText = state.searchQuery
      ? 'По текущему запросу в этом дне пусто'
      : state.activeFilter !== 'all'
        ? 'По выбранному фильтру здесь ничего нет'
        : 'Пока пусто';
    setText(dom.dayModalEmpty, emptyText);
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

export function openManualModal() {
  if (manualOpen) return;
  rememberFocus();
  manualOpen = true;
  showModal(dom.manualModalRoot);
  setTimeout(() => dom.manualCloseBtn?.focus(), 20);
}

export function closeManualModal() {
  if (!manualOpen) return;
  hideModal(dom.manualModalRoot);
  manualOpen = false;
  restoreFocus();
}
