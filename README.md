# VAN TRU FREE Week Planner

Статический vanilla JavaScript week planner / todo dashboard без сборщика и без фреймворков.

## Запуск

Откройте [index.html](/Users/wuvan/Documents/Codex/2026-04-19-zip-src-app-init-js-core/index.html) в браузере или поднимите любой простой статический сервер из папки проекта.

## Что умеет

- добавление, редактирование и удаление задач
- архив и очистка архива
- фильтры по категориям и срочности
- импорт и экспорт JSON
- drag and drop задач по дням
- day modal, preview modal и confirm modal
- toast-уведомления
- светлая и тёмная тема
- анимированный background
- часы и текущая дата
- сохранение и восстановление из `localStorage`

## Архитектура

- `src/core` — чистая бизнес-логика и вычисления
- `src/store` — состояние приложения и orchestration actions
- `src/services` — `localStorage`, тема, background, Telegram, import/export
- `src/ui` — DOM, render, task view, modal, toast, events, focus trap
- `src/shared` — конфиг и общие утилиты
- `src/app/init.js` — точка входа
