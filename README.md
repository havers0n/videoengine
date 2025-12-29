# Videoengine R&D

R&D проект по генерации анимационных движков с использованием Gemini.

## Быстрый Старт

### Миграция Legacy Данных

Если у вас есть данные в `data/`, мигрируйте их:

```bash
npm run migrate:legacy
```

### Новый Run

1. Создайте директорию: `mkdir runs/2025-12-29_01`
2. Поместите zip-файлы в `runs/2025-12-29_01/zips/`
3. Запустите ингест: `npm run ingest -- runs/2025-12-29_01`

## Структура

- `/runs/` - все прогоны генерации (run-based формат)
- `/master/` - агрегированный датасет и конфигурация
- `/data/` - legacy данные (будут мигрированы в runs/legacy_01/)

Подробнее см. [README_RUNS.md](./README_RUNS.md)

## Команды

- `npm run ingest -- runs/YYYY-MM-DD_HH` - ингест нового run
- `npm run migrate:legacy` - миграция legacy данных
- `npm run analyze -- <path>` - анализ вариантов
- `npm run process:stats -- <json>` - статистика по результатам
