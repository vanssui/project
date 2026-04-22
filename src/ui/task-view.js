import { getArchiveMeta } from '../core/archive.js';
import { state } from '../store/state.js';

let handlers = {
  onToggle: null,
  onEdit: null,
  onDelete: null,
  onPreview: null,
  onDuplicate: null,
  onMove: null,
  onLongPressStart: null,
  onLongPressCancel: null
};

const previewObserverMap = new WeakMap();
const previewObserver = typeof ResizeObserver === 'function'
  ? new ResizeObserver((entries) => {
    for (const entry of entries) {
      const previewButton = previewObserverMap.get(entry.target);
      if (!previewButton) continue;
      updatePreviewVisibility(entry.target, previewButton);
    }
  })
  : null;

function svg(id) {
  return `<svg class="icon" aria-hidden="true"><use href="#${id}"></use></svg>`;
}

function updatePreviewVisibility(title, previewButton) {
  const isClamped = title.scrollHeight > title.clientHeight + 1;
  previewButton.classList.toggle('hidden', !isClamped);
  previewButton.setAttribute('aria-hidden', String(!isClamped));
}

function observePreviewVisibility(title, previewButton) {
  requestAnimationFrame(() => updatePreviewVisibility(title, previewButton));
  if (!previewObserver) return;
  previewObserverMap.set(title, previewButton);
  previewObserver.observe(title);
}

export function setTaskViewHandlers(nextHandlers) {
  handlers = { ...handlers, ...nextHandlers };
}

export function createTaskElement(task, { isArchive = false } = {}) {
  const element = document.createElement('div');
  element.className = `task ${task.pri || ''} cat-${task.cat}`;
  element.dataset.id = String(task.id);
  element.dataset.category = task.cat;
  element.dataset.priority = task.pri || 'normal';

  if (isArchive) {
    element.classList.add('is-archive');
  }

  if (state.recentTaskId === task.id) {
    element.classList.add('task-fresh');
  }

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  if (isArchive) {
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
  element.setAttribute('aria-label', `${task.title}. ${task.cat}. ${task.pri === 'urgent' ? 'Срочная задача.' : 'Обычный приоритет.'}`);
  element.title = 'Клик отмечает задачу выполненной. Двойной клик или долгое нажатие открывает редактирование.';

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

  if (task.pri === 'urgent') {
    const urgentBadge = document.createElement('span');
    urgentBadge.className = 'task-badge task-badge-urgent';
    urgentBadge.textContent = 'Срочно';
    meta.appendChild(urgentBadge);
  }

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

  const duplicateButton = document.createElement('button');
  duplicateButton.type = 'button';
  duplicateButton.className = 'clone-btn';
  duplicateButton.setAttribute('aria-label', 'Дублировать');
  duplicateButton.innerHTML = svg('copy');
  duplicateButton.addEventListener('click', (event) => {
    event.stopPropagation();
    handlers.onDuplicate?.(task.id);
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

  actions.append(previewButton, duplicateButton, editButton, deleteButton);
  content.append(title, meta);
  element.append(content, actions);

  element.addEventListener('click', () => {
    if (state.longPressTriggered) {
      state.longPressTriggered = false;
      return;
    }
    if (state.draggedTaskId !== null) return;
    handlers.onToggle?.(task.id, element);
  });

  element.addEventListener('keydown', (event) => {
    if (event.target.closest('button')) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
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

  observePreviewVisibility(title, previewButton);

  return element;
}
