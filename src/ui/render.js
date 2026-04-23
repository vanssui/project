import { PREVIEW_LIMIT, RING_CIRC, categories, dayNames, daysShort } from '../shared/config.js';
import { pluralizeTasks, setText } from '../shared/utils.js';
import { buildStats } from '../core/stats.js';
import { sortArchiveTasks, groupArchiveTasks } from '../core/archive.js';
import { dom, ringMap } from './dom.js';
import { createTaskElement } from './task-view.js';
import { state } from '../store/state.js';

let callbacks = {
  onOpenDay: () => {},
  onFocusToday: () => {},
  onFocusUrgentToday: () => {}
};
const dayCardCache = new Map();

const dayAccentMap = {
  'Дом': 'rgba(88,170,255,.24)',
  'Работа': 'rgba(255,139,74,.24)',
  'Личное': 'rgba(67,230,138,.24)'
};

export function setRenderCallbacks(nextCallbacks) {
  callbacks = { ...callbacks, ...nextCallbacks };
}

function getDominantCategory(tasks) {
  if (!tasks.length) return '';
  const counts = Object.fromEntries(categories.map((category) => [category, 0]));
  tasks.forEach((task) => {
    if (counts[task.cat] !== undefined) counts[task.cat] += 1;
  });
  return Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] || '';
}

function getDaySummaryText(visible) {
  const activeCount = visible.length;
  const urgentCount = visible.filter((task) => task.pri === 'urgent').length;
  if (!activeCount) return 'Новый ритм появится, когда добавишь задачу';
  if (!urgentCount) return `${activeCount} активн. · ровный темп`;
  return `${activeCount} активн. · ${urgentCount} срочн.`;
}

function getDayHint(dayId, hasAllTasks, hasVisibleTasks) {
  if (hasVisibleTasks) return '';
  if (state.searchQuery) return 'По этому запросу здесь ничего не найдено';
  if (hasAllTasks && state.activeFilter !== 'all') return 'По текущему фильтру день чист';
  if (!hasAllTasks && dayId === state.currentDayId) return 'Сегодня можно держать ровный темп';
  if (!hasAllTasks && (dayId === 'sat' || dayId === 'sun')) return 'Спокойное окно без лишнего шума';
  if (!hasAllTasks) return 'Пока тихо. Здесь можно не усложнять';
  return 'Скрыто текущими условиями просмотра';
}

function createFocusChip({ label, tone = '', title = '', onClick = null }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `focus-chip ${tone}`.trim();
  button.textContent = label;
  if (title) button.title = title;
  if (typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  } else {
    button.disabled = true;
  }
  return button;
}

function trimFocusLabel(value, max = 28) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function renderFocusStrip(stats) {
  if (!dom.focusStrip) return;

  const todayTasks = stats.activeByDay[state.currentDayId] || [];
  const todayVisible = stats.visibleActiveByDay[state.currentDayId] || [];
  const todayUrgent = todayTasks.filter((task) => task.pri === 'urgent').length;
  const archiveGroups = groupArchiveTasks(stats.archiveVisible);
  const rhythm = stats.insights?.rhythm;
  const nextFocusTask = stats.insights?.nextFocusTask;
  const staleCount = stats.insights?.staleCount || 0;
  const stalestTask = stats.insights?.stalestTask;
  const fragment = document.createDocumentFragment();

  if (state.seededDemoSession) {
    fragment.appendChild(createFocusChip({
      label: 'Стартовый набор загружен',
      tone: 'demo',
      title: 'Это демо-задачи для быстрого старта. Их можно менять или удалить.'
    }));
  }

  fragment.appendChild(createFocusChip({
    label: todayVisible.length
      ? todayUrgent
        ? `Сегодня: ${todayVisible.length} ${pluralizeTasks(todayVisible.length)} · ${todayUrgent} срочн.`
        : `Сегодня: ${todayVisible.length} ${pluralizeTasks(todayVisible.length)}`
      : 'Сегодня: спокойное окно',
    tone: 'current',
    title: 'Быстрый фокус на текущем дне',
    onClick: callbacks.onFocusToday
  }));

  fragment.appendChild(createFocusChip({
    label: rhythm ? `Уровень: ${rhythm.label}` : 'Уровень: Старт',
    tone: rhythm?.tone || 'level-low',
    title: rhythm
      ? `Текущий темп по завершённым задачам и серии дней: ${rhythm.label}`
      : 'Текущий рабочий темп'
  }));

  if (nextFocusTask) {
    fragment.appendChild(createFocusChip({
      label: `Следом: ${trimFocusLabel(nextFocusTask.title)}`,
      tone: nextFocusTask.pri === 'urgent' ? 'urgent' : 'focus',
      title: `Следующий лучший фокус: ${nextFocusTask.title}`,
      onClick: () => callbacks.onOpenDay(nextFocusTask.day)
    }));
  }

  fragment.appendChild(createFocusChip({
    label: staleCount > 0
      ? `Хвосты: ${staleCount} старше 3д`
      : 'Хвостов старше 3д нет',
    tone: staleCount > 0 ? 'stale' : 'done',
    title: staleCount > 0
      ? 'Есть задачи, которые висят дольше трёх дней'
      : 'Старые хвосты не копятся',
    onClick: staleCount > 0 && stalestTask ? () => callbacks.onOpenDay(stalestTask.day) : null
  }));

  const archiveSummary = [];
  if (archiveGroups.today.length) archiveSummary.push(`архив сегодня ${archiveGroups.today.length}`);
  if (archiveGroups.yesterday.length) archiveSummary.push(`вчера ${archiveGroups.yesterday.length}`);
  if (archiveGroups.earlier.length) archiveSummary.push(`ранее ${archiveGroups.earlier.length}`);
  if (archiveSummary.length) {
    fragment.appendChild(createFocusChip({
      label: archiveSummary.join(' · '),
      tone: 'archive',
      title: 'Срез по архиву за последние дни'
    }));
  }

  dom.focusStrip.replaceChildren(fragment);
}

function createDayCard(dayId, index) {
  const card = document.createElement('div');
  card.className = 'day-card';
  card.dataset.day = dayId;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');

  const header = document.createElement('div');
  header.className = 'day-title-row';

  const titleEl = document.createElement('div');
  titleEl.className = 'day-title';
  titleEl.textContent = dayNames[index] || dayId;

  const meta = document.createElement('div');
  meta.className = 'day-meta';

  const todayBadge = document.createElement('span');
  todayBadge.className = 'today-badge';
  todayBadge.textContent = 'TODAY';

  const countEl = document.createElement('div');
  countEl.className = 'day-count';

  meta.append(todayBadge, countEl);
  header.append(titleEl, meta);

  const taskList = document.createElement('div');
  taskList.className = 'day-tasks';

  const summary = document.createElement('div');
  summary.className = 'day-summary';

  const moreWrap = document.createElement('div');
  moreWrap.className = 'day-more-wrap';

  const moreButton = document.createElement('button');
  moreButton.type = 'button';
  moreButton.className = 'day-more-btn';
  moreButton.addEventListener('click', (event) => {
    event.stopPropagation();
    callbacks.onOpenDay(dayId);
  });

  moreWrap.appendChild(moreButton);

  const hint = document.createElement('div');
  hint.className = 'day-preview-hint';

  card.append(header, summary, taskList, moreWrap, hint);

  card.addEventListener('click', (event) => {
    if (event.target.closest('.task') || event.target.closest('.day-more-btn')) return;
    callbacks.onOpenDay(dayId);
  });

  card.addEventListener('keydown', (event) => {
    if (event.target.closest('.task') || event.target.closest('.day-more-btn')) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    callbacks.onOpenDay(dayId);
  });

  card.addEventListener('dragover', (event) => {
    if (state.draggedTaskId === null) return;
    event.preventDefault();
    card.classList.add('drag-over');
  });

  card.addEventListener('dragleave', (event) => {
    if (!card.contains(event.relatedTarget)) {
      card.classList.remove('drag-over');
    }
  });

  card.addEventListener('drop', (event) => {
    event.preventDefault();
    card.classList.remove('drag-over');
    const id = Number(event.dataTransfer?.getData('text/plain'));
    if (!id) return;
    document.dispatchEvent(new CustomEvent('planner:drop-task', {
      detail: { id, dayId }
    }));
  });

  return {
    card,
    refs: {
      titleEl,
      todayBadge,
      countEl,
      summary,
      taskList,
      moreWrap,
      moreButton,
      hint
    }
  };
}

function ensureWeekGrid() {
  if (dom.grid.children.length === daysShort.length) return;
  const fragment = document.createDocumentFragment();
  daysShort.forEach((dayId, index) => {
    if (!dayCardCache.has(dayId)) {
      dayCardCache.set(dayId, createDayCard(dayId, index));
    }
    fragment.appendChild(dayCardCache.get(dayId).card);
  });
  dom.grid.replaceChildren(fragment);
}

function renderWeekStats(stats) {
  const percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  setText(dom.weekProgressValue, `${percent}%`);

  for (const category of categories) {
    const meta = ringMap[category];
    const categoryStats = stats.byCat[category];
    if (!meta || !categoryStats) continue;
    const progress = categoryStats.total ? categoryStats.done / categoryStats.total : 0;
    const ringValue = `${categoryStats.done}/${categoryStats.total}`;
    const ringValueLength = ringValue.length;
    meta.ring.style.strokeDashoffset = String(RING_CIRC * (1 - progress));
    meta.value.dataset.size = ringValueLength >= 9 ? 'micro' : ringValueLength >= 7 ? 'compact' : 'default';
    meta.value.dataset.layout = ringValueLength >= 7 ? 'stack' : 'inline';
    meta.value.title = `${categoryStats.done} из ${categoryStats.total}`;
    if (ringValueLength >= 7) {
      const main = document.createElement('span');
      main.className = 'ring-value-main';
      main.textContent = String(categoryStats.done);
      const sub = document.createElement('span');
      sub.className = 'ring-value-sub';
      sub.textContent = `/ ${categoryStats.total}`;
      meta.value.replaceChildren(main, sub);
    } else {
      setText(meta.value, ringValue);
    }
  }
}

function updateDayCard(dayId, index, stats) {
  const dayCard = dayCardCache.get(dayId) || createDayCard(dayId, index);
  dayCardCache.set(dayId, dayCard);

  const { card, refs } = dayCard;
  const visible = stats.visibleActiveByDay[dayId];
  const all = stats.activeByDay[dayId];
  const preview = visible.slice(0, PREVIEW_LIMIT);
  const hidden = Math.max(0, visible.length - PREVIEW_LIMIT);
  const isToday = dayId === state.currentDayId;
  const dominantCategory = getDominantCategory(visible.length ? visible : all);
  const accent = dayAccentMap[dominantCategory] || 'rgba(255,106,45,.16)';
  const hintText = getDayHint(dayId, Boolean(all.length), Boolean(visible.length));
  const urgentVisibleCount = visible.filter((task) => task.pri === 'urgent').length;
  const isBusyDay = all.length >= 5;
  const isOverloadedDay = all.length >= 7;

  card.classList.toggle('today', isToday);
  card.classList.toggle('is-busy', isBusyDay);
  card.classList.toggle('is-overloaded', isOverloadedDay);
  card.classList.toggle('has-urgent-focus', urgentVisibleCount > 0);
  card.classList.toggle('is-empty', !all.length);
  card.classList.toggle('is-filter-empty', Boolean(all.length && !visible.length));
  card.classList.toggle('is-search-empty', Boolean(state.searchQuery && all.length && !visible.length));
  card.classList.remove('drag-over');
  card.style.setProperty('--day-accent', accent);
  card.setAttribute('aria-current', isToday ? 'date' : 'false');
  card.setAttribute(
    'aria-label',
    `${dayNames[index] || dayId}. Видимых задач ${visible.length}, всего активных ${all.length}.`
  );
  refs.titleEl.textContent = dayNames[index] || dayId;
  refs.todayBadge.style.display = isToday ? '' : 'none';
  refs.countEl.textContent = `${visible.length}/${all.length} задач`;
  refs.summary.textContent = getDaySummaryText(visible);
  refs.taskList.replaceChildren();

  preview.forEach((task, taskIndex) => {
    refs.taskList.appendChild(createTaskElement(task, {
      isArchive: false,
      isLead: taskIndex === 0 && (isBusyDay || task.pri === 'urgent')
    }));
  });

  if (hidden > 0) {
    refs.moreWrap.style.display = '';
    refs.moreButton.textContent = `+ ещё ${hidden}`;
    refs.moreButton.setAttribute('aria-label', `Показать ещё ${hidden} задач за ${dayNames[index] || dayId}`);
  } else {
    refs.moreWrap.style.display = 'none';
    refs.moreButton.textContent = '';
    refs.moreButton.removeAttribute('aria-label');
  }

  if (!visible.length) {
    refs.hint.style.display = '';
    refs.hint.textContent = hintText;
  } else {
    refs.hint.style.display = 'none';
    refs.hint.textContent = '';
  }
}

function createArchiveGroup(titleText, tasks) {
  const section = document.createElement('section');
  section.className = 'archive-group';

  const head = document.createElement('div');
  head.className = 'archive-group-head';

  const title = document.createElement('div');
  title.className = 'archive-group-title';
  title.textContent = titleText;

  const count = document.createElement('div');
  count.className = 'archive-group-count';
  count.textContent = String(tasks.length);

  const list = document.createElement('div');
  list.className = 'archive-group-list';
  tasks.forEach((task) => list.appendChild(createTaskElement(task, { isArchive: true })));

  head.append(title, count);
  section.append(head, list);
  return section;
}

function renderArchive(stats) {
  const sorted = sortArchiveTasks(stats.archiveVisible);
  setText(dom.archiveCount, `${sorted.length} ${pluralizeTasks(sorted.length)}`);
  const groups = groupArchiveTasks(sorted);
  if (dom.archiveSummary) {
    const summaryParts = [];
    if (groups.today.length) summaryParts.push(`Сегодня ${groups.today.length}`);
    if (groups.yesterday.length) summaryParts.push(`Вчера ${groups.yesterday.length}`);
    if (groups.earlier.length) summaryParts.push(`Ранее ${groups.earlier.length}`);
    setText(dom.archiveSummary, summaryParts.join(' · ') || 'Пока пусто');
  }
  if (dom.clearOlderArchiveBtn) {
    const hasEarlier = groups.earlier.length > 0;
    dom.clearOlderArchiveBtn.hidden = !hasEarlier;
    dom.clearOlderArchiveBtn.disabled = !hasEarlier;
    dom.clearOlderArchiveBtn.setAttribute('aria-disabled', String(!hasEarlier));
  }

  if (!sorted.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = state.searchQuery ? 'В архиве по запросу пусто' : 'Архив пуст';
    dom.archive.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  if (groups.today.length) fragment.appendChild(createArchiveGroup('Сегодня', groups.today));
  if (groups.yesterday.length) fragment.appendChild(createArchiveGroup('Вчера', groups.yesterday));
  if (groups.earlier.length) fragment.appendChild(createArchiveGroup('Ранее', groups.earlier));
  dom.archive.replaceChildren(fragment);
}

export function renderApp() {
  const stats = buildStats(state.tasks, state.activeFilter, state.searchQuery);
  renderWeekStats(stats);
  renderFocusStrip(stats);
  ensureWeekGrid();
  daysShort.forEach((dayId, index) => updateDayCard(dayId, index, stats));
  renderArchive(stats);
}
