import { dom } from './dom.js';
import { handleFocusTrap } from './modals.js';

export function bindEvents(handlers) {
  const submitTask = (event) => {
    event?.preventDefault();
    handlers.onAddTask();
  };

  dom.taskForm?.addEventListener('submit', submitTask);
  dom.exportBtn.addEventListener('click', handlers.onExport);
  dom.manualBtn?.addEventListener('click', handlers.onOpenManual);
  dom.clearArchiveBtn.addEventListener('click', handlers.onClearArchive);
  dom.clearActiveBtn?.addEventListener('click', handlers.onClearActive);
  dom.clearOlderArchiveBtn?.addEventListener('click', handlers.onClearArchiveEarlier);
  dom.telegramBtn?.addEventListener('click', handlers.onOpenTelegram);
  dom.todayBtn?.addEventListener('click', handlers.onScrollToToday);
  dom.compactToggleBtn?.addEventListener('click', handlers.onToggleCompact);
  dom.focusToggleBtn?.addEventListener('click', handlers.onToggleFocusMode);
  dom.clearSearchBtn?.addEventListener('click', handlers.onClearSearch);
  dom.dismissOnboardingBtn?.addEventListener('click', handlers.onDismissOnboarding);
  dom.modalBackdrop.addEventListener('click', () => handlers.onCloseConfirm(null));
  dom.editModalBackdrop.addEventListener('click', () => handlers.onCloseEdit(null));
  dom.taskModalBackdrop.addEventListener('click', () => handlers.onCloseTask(null));
  dom.dayModalBackdrop.addEventListener('click', () => handlers.onCloseDay(null));
  dom.manualModalBackdrop?.addEventListener('click', () => handlers.onCloseManual());
  dom.editCancelBtn.addEventListener('click', () => handlers.onCloseEdit(null));
  dom.editSaveBtn.addEventListener('click', handlers.onSubmitEdit);
  dom.dayModalCloseBtn.addEventListener('click', () => handlers.onCloseDay(null));
  dom.manualCloseBtn?.addEventListener('click', () => handlers.onCloseManual());

  dom.taskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handlers.onAddTask();
    }
  });
  dom.taskInput.addEventListener('input', handlers.onTaskInputChange);
  dom.taskPriSelect?.addEventListener('change', handlers.onTaskPriorityChange);
  dom.taskSearchInput?.addEventListener('input', (event) => {
    handlers.onSearchChange(event.target.value);
  });
  dom.taskSearchInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    handlers.onClearSearch();
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
    if (dom.taskModalRoot.classList.contains('show')) return handlers.onCloseTask(null);
    if (dom.editModalRoot.classList.contains('show')) return handlers.onCloseEdit(null);
    if (dom.dayModalRoot.classList.contains('show')) return handlers.onCloseDay(null);
    if (dom.manualModalRoot?.classList.contains('show')) return handlers.onCloseManual();
    if (dom.modalRoot.classList.contains('show')) return handlers.onCloseConfirm(null);
  });

  dom.filterButtons.forEach((button) => {
    button.addEventListener('click', () => handlers.onSetFilter(button.dataset.filter));
  });
  dom.presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      handlers.onApplyPreset({
        cat: button.dataset.cat || '',
        pri: button.dataset.pri || ''
      });
    });
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
