import { dom } from './dom.js';
import { handleFocusTrap } from './modals.js';

export function bindEvents(handlers) {
  dom.addTaskBtn.addEventListener('click', handlers.onAddTask);
  dom.exportBtn.addEventListener('click', handlers.onExport);
  dom.clearArchiveBtn.addEventListener('click', handlers.onClearArchive);
  dom.telegramBtn?.addEventListener('click', handlers.onOpenTelegram);
  dom.modalBackdrop.addEventListener('click', () => handlers.onCloseConfirm(null));
  dom.editModalBackdrop.addEventListener('click', () => handlers.onCloseEdit(null));
  dom.previewModalBackdrop.addEventListener('click', () => handlers.onClosePreview(null));
  dom.dayModalBackdrop.addEventListener('click', () => handlers.onCloseDay(null));
  dom.editCancelBtn.addEventListener('click', () => handlers.onCloseEdit(null));
  dom.editSaveBtn.addEventListener('click', handlers.onSubmitEdit);
  dom.previewCloseBtn.addEventListener('click', () => handlers.onClosePreview(null));
  dom.dayModalCloseBtn.addEventListener('click', () => handlers.onCloseDay(null));

  dom.taskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handlers.onAddTask();
    }
  });

  dom.editTaskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handlers.onSubmitEdit();
      return;
    }
    if (event.key === 'Escape') {
      handlers.onCloseEdit(null);
    }
  });

  document.addEventListener('keydown', (event) => {
    handleFocusTrap(event);
    if (event.key !== 'Escape') return;
    if (dom.previewModalRoot.classList.contains('show')) return handlers.onClosePreview(null);
    if (dom.editModalRoot.classList.contains('show')) return handlers.onCloseEdit(null);
    if (dom.dayModalRoot.classList.contains('show')) return handlers.onCloseDay(null);
    if (dom.modalRoot.classList.contains('show')) return handlers.onCloseConfirm(null);
  });

  dom.filterButtons.forEach((button) => {
    button.addEventListener('click', () => handlers.onSetFilter(button.dataset.filter));
  });

  dom.jsonFileInput.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    handlers.onImport(file);
  });

  dom.themeToggle.addEventListener('change', () => {
    handlers.onThemeChange(dom.themeToggle.checked ? 'light' : 'dark');
  });

  const onSystemThemeChange = (event) => handlers.onSystemThemeChange(event.matches ? 'light' : 'dark');
  if (typeof dom.systemThemeQuery.addEventListener === 'function') {
    dom.systemThemeQuery.addEventListener('change', onSystemThemeChange);
  } else if (typeof dom.systemThemeQuery.addListener === 'function') {
    dom.systemThemeQuery.addListener(onSystemThemeChange);
  }

  document.addEventListener('planner:drop-task', (event) => {
    handlers.onDropTask(event.detail.id, event.detail.dayId);
  });
}
