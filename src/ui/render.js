import { PREVIEW_LIMIT, RING_CIRC, categories, dayNames, daysShort } from '../shared/config.js';
import { pluralizeTasks, setText } from '../shared/utils.js';
import { buildStats } from '../core/stats.js';
import { sortArchiveTasks, groupArchiveTasks } from '../core/archive.js';
import { dom, ringMap } from './dom.js';
import { createTaskElement } from './task-view.js';
import { state } from '../store/state.js';

let callbacks = {
  onOpenDay: () => {}
};
const dayCardCache = new Map();

export function setRenderCallbacks(nextCallbacks) {
  callbacks = { ...callbacks, ...nextCallbacks };
}

function createDayCard(dayId, index) {
  const card = document.createElement('div');
  card.className = 'day-card';
  card.dataset.day = dayId;

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

  card.append(header, taskList, moreWrap, hint);

  card.addEventListener('click', (event) => {
    if (event.target.closest('.task') || event.target.closest('.day-more-btn')) return;
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
    meta.ring.style.strokeDashoffset = String(RING_CIRC * (1 - progress));
    setText(meta.value, `${categoryStats.done}/${categoryStats.total}`);
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

  card.classList.toggle('today', isToday);
  card.classList.remove('drag-over');
  refs.titleEl.textContent = dayNames[index] || dayId;
  refs.todayBadge.style.display = isToday ? '' : 'none';
  refs.countEl.textContent = `${visible.length}/${all.length} задач`;
  refs.taskList.replaceChildren();

  preview.forEach((task) => refs.taskList.appendChild(createTaskElement(task, { isArchive: false })));

  if (hidden > 0) {
    refs.moreWrap.style.display = '';
    refs.moreButton.textContent = `+ ещё ${hidden}`;
  } else {
    refs.moreWrap.style.display = 'none';
    refs.moreButton.textContent = '';
  }

  if (!all.length) {
    refs.hint.style.display = '';
    refs.hint.textContent = 'Нет задач';
  } else if (!visible.length) {
    refs.hint.style.display = '';
    refs.hint.textContent = 'По фильтру пусто';
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

  if (!sorted.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Архив пуст';
    dom.archive.replaceChildren(empty);
    return;
  }

  const groups = groupArchiveTasks(sorted);
  const fragment = document.createDocumentFragment();
  if (groups.today.length) fragment.appendChild(createArchiveGroup('Сегодня', groups.today));
  if (groups.yesterday.length) fragment.appendChild(createArchiveGroup('Вчера', groups.yesterday));
  if (groups.earlier.length) fragment.appendChild(createArchiveGroup('Ранее', groups.earlier));
  dom.archive.replaceChildren(fragment);
}

export function renderApp() {
  const stats = buildStats(state.tasks, state.activeFilter);
  renderWeekStats(stats);
  ensureWeekGrid();
  daysShort.forEach((dayId, index) => updateDayCard(dayId, index, stats));
  renderArchive(stats);
}
