export function addTask(tasks, task) {
  return [...tasks, task];
}

export function updateTaskTitle(tasks, taskId, title) {
  let changed = false;
  const next = tasks.map((task) => {
    if (task.id !== taskId) return task;
    if (task.title === title) return task;
    changed = true;
    return { ...task, title };
  });
  return { changed, tasks: next };
}

export function deleteTask(tasks, taskId) {
  const next = tasks.filter((task) => task.id !== taskId);
  return { changed: next.length !== tasks.length, tasks: next };
}

export function toggleTaskDone(tasks, taskId, at = Date.now()) {
  let changed = false;
  const next = tasks.map((task) => {
    if (task.id !== taskId) return task;
    changed = true;
    const done = !task.done;
    return {
      ...task,
      done,
      completedAt: done ? at : null
    };
  });
  return { changed, tasks: next };
}

export function moveTaskToDay(tasks, taskId, day) {
  let changed = false;
  const next = tasks.map((task) => {
    if (task.id !== taskId || task.done || task.day === day) return task;
    changed = true;
    return { ...task, day };
  });
  return { changed, tasks: next };
}

export function clearArchive(tasks) {
  const next = tasks.filter((task) => !task.done);
  return { changed: next.length !== tasks.length, tasks: next };
}

export function replaceTasks(tasks) {
  const used = new Set();
  return tasks.map((task) => {
    let id = task.id;
    while (used.has(id)) {
      id += 1;
    }
    used.add(id);
    return { ...task, id };
  });
}

export function appendImportedTasks(currentTasks, importedTasks) {
  const used = new Set(currentTasks.map((task) => task.id));
  const next = [...currentTasks];

  for (const item of importedTasks) {
    let id = item.id;
    while (used.has(id)) {
      id += 1;
    }
    used.add(id);
    next.push({ ...item, id });
  }

  return next;
}
