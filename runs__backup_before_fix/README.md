# Runs Directory

Эта директория содержит все прогоны генерации вариантов движков.

## Структура run

Каждый run имеет следующую структуру:

```
runs/
  2025-12-29_01/
    prompt_01.txt          # Промпты для генерации (опционально)
    prompt_02.txt
    zips/                  # Исходные zip-файлы из Downloads
      variant1.zip
      variant2.zip
    extracted/             # Распакованные варианты
      variant1/
      variant2/
    variants/               # Нормализованные варианты (готовы к анализу)
      variant1/
      variant2/
    reports/                # Результаты анализа
      variants_features.json
      variants_features.csv
      run_report.md
    mapping.json            # Маппинг zip → variant → prompt
```

## Legacy данные

Текущие данные из `data/` мигрированы в `runs/legacy_01/`.

## Использование

### Создание нового run

1. Создайте директорию run:
   ```bash
   mkdir runs/2025-12-29_01
   ```

2. Поместите zip-файлы в `runs/2025-12-29_01/zips/`

3. (Опционально) Создайте файлы промптов `prompt_01.txt`, `prompt_02.txt`, etc.

4. Запустите ингест:
   ```bash
   npm run ingest -- runs/2025-12-29_01
   ```

### Результаты

После ингеста:
- Варианты нормализованы в `variants/`
- Анализ выполнен, результаты в `reports/`
- Данные добавлены в `master/dataset.json`

