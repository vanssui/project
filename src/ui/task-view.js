import { getArchiveMeta } from '../core/archive.js';
import { state } from '../store/state.js';

let handlers = {
  onToggle: null,
  onEdit: null,
  onDelete: null,
  onPreview: null,
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

export function createTaskElement(task, { isArchive = false } = {}) {
  const element = document.createElement('div');
  element.className = `task ${task.pri || ''} cat-${task.cat}`;
  element.dataset.id = String(task.id);

  if (isArchive) {
    element.classList.add('is-archive');
  }

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  if (isArchive) {
    const main = document.createElement('div');
    main.className = 'archive-task-main';

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'archive-task-meta';
    const archiveMeta = getArchiveMeta(task);
    meta.innerHTML = `
      <span class="archive-task-cat">${task.cat}</span>
      <span class="archive-task-sep">•</span>
      <span class="archive-task-date">${archiveMeta.date}</span>
      <span class="archive-task-time">${archiveMeta.time}</span>
    `;

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
    return element;
  }

  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;

  const previewButton = document.createElement('button');
  previewButton.type = 'button';
  previewButton.className = 'preview-btn hidden';
  previewButton.setAttribute('aria-label', 'Предпросмотр');
  previewButton.innerHTML = svg('eye');
  previewButton.addEventListener('click', (event) => {
    event.stopPropagation();
    handlers.onPreview?.(task.id);
  });

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

  actions.append(previewButton, editButton, deleteButton);
  element.append(title, actions);

  element.addEventListener('click', () => {
    if (state.longPressTriggered) {
      state.longPressTriggered = false;
      return;
    }
    if (state.draggedTaskId !== null) return;
    handlers.onToggle?.(task.id, element);
  });

  element.addEventListener('dblclick', () => handlers.onEdit?.(task.id));
  element.addEventListener('mousedown', () => handlers.onLongPressStart?.(task.id));
  element.addEventListener('touchstart', () => handlers.onLongPressStart?.(task.id), { passive: true });
  element.addEventListener('mouseup', () => handlers.onLongPressCancel?.());
  element.addEventListener('mouseleave', () => handlers.onLongPressCancel?.());
  element.addEventListener('touchend', () => handlers.onLongPressCancel?.(), { passive: true });
  element.addEventListener('touchcancel', () => handlers.onLongPressCancel?.(), { passive: true });

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

  requestAnimationFrame(() => {
    const isClamped = title.scrollHeight > title.clientHeight + 1;
    previewButton.classList.toggle('hidden', !isClamped);
  });

  return element;
}
