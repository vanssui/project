import { getArchiveMeta } from '../core/archive.js';
import { formatTaskAgeLabel, getTaskAgeDays } from '../core/date.js';
import { state } from '../store/state.js';

let handlers = {
  onOpen: null,
  onToggle: null,
  onEdit: null,
  onDelete: null,
  onMove: null,
  onLongPressStart: null,
  onLongPressCancel: null
};

function svg(id) {
  return `<svg class="icon" aria-hidden="true"><use href="#${id}"></use></svg>`;
}

export function setTaskViewHandlers(nextHandlers) {
  handlers = { ...handlers, ...nextHandlers };
}

export function createTaskElement(task, { isArchive = false, isLead = false } = {}) {
  const element = document.createElement('div');
  element.className = `task ${task.pri || ''} cat-${task.cat}`;
  element.dataset.id = String(task.id);
  element.dataset.category = task.cat;
  element.dataset.priority = task.pri || 'normal';
  element.dataset.ageDays = String(getTaskAgeDays(task.createdAt));

  if (isArchive) {
    element.classList.add('is-archive');
  }

  if (state.recentTaskId === task.id) {
    element.classList.add('task-fresh');
  }
  if (isLead) {
    element.classList.add('task-lead');
  }

  if (isArchive) {
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    element.tabIndex = 0;
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', `Вернуть задачу "${task.title}" в активный список`);

    const main = document.createElement('div');
    main.className = 'archive-task-main';

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'archive-task-meta';
    const archiveMeta = getArchiveMeta(task);
    const metaCategory = document.createElement('span');
    metaCategory.className = 'archive-task-cat';
    metaCategory.textContent = task.cat;
    const metaSeparator = document.createElement('span');
    metaSeparator.className = 'archive-task-sep';
    metaSeparator.textContent = '•';
    const metaDate = document.createElement('span');
    metaDate.className = 'archive-task-date';
    metaDate.textContent = archiveMeta.date;
    const metaTime = document.createElement('span');
    metaTime.className = 'archive-task-time';
    metaTime.textContent = archiveMeta.time;
    meta.append(metaCategory, metaSeparator, metaDate, metaTime);

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'edit-btn';
    editButton.setAttribute('aria-label', 'Редактировать');
    editButton.innerHTML = svg('edit');
    editButton.addEventListener('click', (event) => {
      event.stopPropagation();
      handlers.onEdit?.(task.id);
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'del-x';
    deleteButton.setAttribute('aria-label', 'Удалить');
    deleteButton.innerHTML = svg('close');
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      handlers.onDelete?.(task.id);
    });

    actions.append(editButton, deleteButton);
    main.append(title, meta);
    element.append(main, actions);
    element.title = 'Восстановить в список';
    element.addEventListener('click', () => handlers.onToggle?.(task.id, element));
    element.addEventListener('keydown', (event) => {
      if (event.target.closest('button')) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      handlers.onToggle?.(task.id, element);
    });
    return element;
  }

  element.tabIndex = 0;
  element.setAttribute('role', 'button');
  const ageLabel = formatTaskAgeLabel(task.createdAt);
  element.setAttribute('aria-label', `${task.title}. ${task.cat}. ${task.pri === 'urgent' ? 'Срочная задача.' : 'Обычный приоритет.'} Возраст: ${ageLabel}. Открыть действия по задаче.`);
  element.title = 'Открыть действия по задаче';

  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;

  const content = document.createElement('div');
  content.className = 'task-content';

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'task-badge task-badge-cat';
  categoryBadge.textContent = task.cat;
  meta.appendChild(categoryBadge);

  const ageBadge = document.createElement('span');
  ageBadge.className = 'task-badge task-badge-age';
  ageBadge.textContent = ageLabel;
  meta.appendChild(ageBadge);

  if (task.pri === 'urgent') {
    const urgentBadge = document.createElement('span');
    urgentBadge.className = 'task-badge task-badge-urgent';
    urgentBadge.textContent = 'Срочно';
    meta.appendChild(urgentBadge);
  }
  content.append(title, meta);
  element.append(content);

  element.addEventListener('click', () => {
    if (state.draggedTaskId !== null) return;
    handlers.onOpen?.(task.id);
  });

  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handlers.onOpen?.(task.id);
  });

  element.draggable = !task.done;
  if (!task.done) {
    element.addEventListener('dragstart', (event) => {
      state.draggedTaskId = task.id;
      element.classList.add('dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(task.id));
      }
      handlers.onLongPressCancel?.();
    });

    element.addEventListener('dragend', () => {
      state.draggedTaskId = null;
      element.classList.remove('dragging');
      document.querySelectorAll('.day-card.drag-over').forEach((card) => card.classList.remove('drag-over'));
    });
  }

  return element;
}
