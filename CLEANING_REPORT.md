# Отчет: Пайплайн очистки и анализа датасета вариантов движков

## Базовые метрики (до очистки)

### Общая статистика
- **Всего вариантов:** 60
- **Средний score:** 14.4
- **Мин/Макс/Медиана:** 3 / 23 / 15

### Распределение классов движков
- **STABLE:** 35 (58.3%)
- **SEMI:** 20 (33.3%)
- **CHAOTIC:** 5 (8.3%)

### Топ-5 вариантов по score
1. `neural-pulse-18s` - score: 23
2. `guardfolio-ai---visual-engine` - score: 22
3. `neuroglitch-physics-engine` - score: 21
4. `canvas-2-d-simulation` - score: 20
5. `deterministic-flux-clusters` - score: 19

### Топ-20 по novelty (уникальности)
1. `guardfolio-ai-visualization` - novelty: 131.71 (⭐ уникальная сигнатура)
2. `guardfolio-ai---visual-engine` - novelty: 123.76 (⭐ уникальная сигнатура)
3. `гравитация` - novelty: 111.75 (⭐ уникальная сигнатура)
4. `neural-pulse-18s` - novelty: 94.29 (⭐ уникальная сигнатура)
5. `deterministic-canvas-physics` - novelty: 91.55

**Уникальных сигнатур:** 19 из 60 вариантов

---

## Выявленные проблемы

### 1. Кандидаты на исключение (мусор/шаблоны)

| Вариант | Файлов | TS/TSX | Причина |
|---------|--------|--------|---------|
| `vite-react-canvas-animation` | 85 | 68 | boilerplate (полный шаблон приложения) |
| `canvas-2-d-simulation` | 81 | 64 | boilerplate (полный шаблон приложения) |
| `verlet-threads (1)` | 12 | 7 | duplicate_name |
| `deterministic-flux-engine (1)` | 11 | 6 | duplicate_name |

**Итого:** 4 варианта для исключения

### 2. Дубликаты по имени

- `deterministic-flux-engine` и `deterministic-flux-engine (1)`
- `verlet-threads` и `verlet-threads (1)`

**Рекомендация:** Оставить оригинальные варианты, удалить версии с `(1)`.

### 3. Дубликаты по содержимому

Найдена 1 группа дубликатов:
- `emergent-analytic-system` (⭐ KEEP, score: 13, 9 файлов)
- `enginepromt` (REMOVE, score: 13, 9 файлов)

**Хеш:** `3760f32fb8364655...` (одинаковое содержимое App.tsx)

---

## Результаты очистки

### Исключенные варианты (5)
1. `canvas-2-d-simulation` - boilerplate
2. `vite-react-canvas-animation` - boilerplate
3. `deterministic-flux-engine (1)` - duplicate_name
4. `verlet-threads (1)` - duplicate_name
5. `enginepromt` - duplicate_content

### Очищенный датасет
- **Всего вариантов:** 60 → **55** (исключено 5)
- **Средний score:** 14.4 → **14.5** (незначительное улучшение)
- **STABLE:** 35 (58.3%) → **30 (54.5%)**
- **SEMI:** 20 (33.3%) → **20 (36.4%)**
- **CHAOTIC:** 5 (8.3%) → **5 (9.1%)**

---

## Анализ качества фич

### Слишком частые фичи (низкая информативность, >= 80%)
- `has_canvas_2d` - 95.0%
- `has_raf` - 93.3%
- `has_cancel_raf` - 91.7%
- `has_resize` - 91.7%
- `pass_particles` - 88.3%
- `has_teal` - 83.3%
- `has_red` - 80.0%

**Рекомендация:** Исключить `has_teal` и `has_red` из scoring (вес = 0).

### Редкие фичи (высокая информативность, <= 20%)
- `setState_in_raf` - 1.7% (анти-паттерн)
- `has_fixed_timestep` - 1.7% ⭐ РЕДКАЯ
- `force_noise_jitter` - 3.3%
- `has_dom_overlay_text` - 8.3%
- `uses_date_now` - 8.3%
- `force_damping_mul` - 9.1%
- `force_spring` - 10.0%
- `has_smoothstep` - 11.7%
- `has_scan_ring` - 15.0%
- `has_clusters` - 18.3%

**Рекомендация:** Увеличить вес для редких фич.

### Стабильность-премиум фичи
- `has_fixed_timestep` - 1.7% ⭐ РЕДКАЯ
- `has_deterministic_rng` - 46.7% ✓ СРЕДНЯЯ
- `has_stateRef` - 33.3% ✓ СРЕДНЯЯ
- `uses_performance_now` - 36.7% ✓ СРЕДНЯЯ

**Рекомендация:** Увеличить вес для этих фич.

### Анти-паттерны
- `setState_in_raf` - 1 вариант (`guardfolio-ai-visualization`)
- `uses_date_now` без `uses_performance_now` - 4 варианта
- Нет детерминированного RNG - 32 варианта (используют `Math.random()`)

---

## Предложения по улучшению scoring

### Новые веса (предложенные)

| Фича | Текущий вес | Предложенный | Изменение |
|------|-------------|--------------|-----------|
| `has_fixed_timestep` | +1 | **+3** | ⬆️ +2 |
| `has_deterministic_rng` | 0 | **+3** | ⬆️ +3 (новое) |
| `has_stateRef` | 0 | **+2** | ⬆️ +2 (новое) |
| `uses_performance_now` | 0 | **+2** | ⬆️ +2 (новое) |
| `uses_date_now` | 0 | **-2** | ⬇️ -2 (штраф, новое) |
| `has_teal` | ? | **0** | ➖ исключить |
| `has_red` | ? | **0** | ➖ исключить |
| `uses_ts_from_raf` | ? | **0** | ➖ исключить |

### Новые метрики

1. **stability_score** - отдельная метрика стабильности
   - Премиум: `has_fixed_timestep` (+5), `has_deterministic_rng` (+4), `has_stateRef` (+3), `uses_performance_now` (+2)
   - Штрафы: `setState_in_raf` (-10), `uses_date_now` без `uses_performance_now` (-3)

2. **premium_score** - отдельная метрика премиум-фич
   - Визуальные: `clusters+threads+hotspots` (+5), `has_shadow_blur` (+3), `has_trails` (+2), `has_gradients` (+1)
   - Физика: `force_spring` (+2), `force_damping_mul` (+2), `force_noise_jitter` (+1)
   - Стабильность: `has_fixed_timestep` (+3), `has_deterministic_rng` (+2)

**Топ-5 по stability_score:**
1. `deterministic-canvas-physics` - stability: 14
2. `canvas-2-d-simulation` - stability: 9
3. `causality-heatmap-18s` - stability: 9
4. `deterministic-canvas-scanner` - stability: 9
5. `deterministic-flux-18` - stability: 9

**Топ-5 по premium_score:**
1. `neural-pulse-18s` - premium: 17
2. `canvas-2-d-simulation` - premium: 15
3. `neuroglitch-physics-engine` - premium: 15
4. `deterministic-flux-clusters` - premium: 13
5. `cluster-dynamics` - premium: 10

---

## Перепроизведенные кластеры

Кластеры с 3+ вариантами (нужно уменьшить генерацию):

1. `-_T_H_TR_GB_-_-_-_OK` - **12 вариантов** (самый частый)
2. `-_T_-_TR_-_-_-_-_OK` - **4 варианта**
3. `-_-_H_TR_GB_-_-_-_OK` - **3 варианта**
4. `-_-_-_TR_-_-_-_-_OK` - **3 варианта**
5. `-_T_-_-_GB_-_-_-_OK` - **3 варианта**

**Рекомендация:** В промптах для Gemini избегать этих комбинаций, фокусироваться на уникальных сигнатурах.

---

## Целевые паттерны для Gemini (prompt targets)

### HIGH PRIORITY

1. **fixed_timestep**
   - Описание: Фиксированный timestep для стабильной физики
   - Текущее: 1 вариант (1.8%)
   - Цель: 11 вариантов (20%)

### MEDIUM PRIORITY

2. **clusters+threads+hotspots+shadowBlur**
   - Описание: Комбинация кластеров, нитей, хотспотов и размытия
   - Текущее: 4 варианта (7.3%)
   - Цель: 14 вариантов (25%)

3. **deterministic_rng**
   - Описание: Детерминированный RNG с seed для воспроизводимости
   - Текущее: 24 варианта (43.6%)
   - Цель: 28 вариантов (50%)

4. **force_noise_jitter**
   - Описание: Редкая фича для вариативности
   - Текущее: 2 варианта (3.6%)
   - Цель: 9 вариантов (16%)

---

## Созданные файлы и команды

### Новые скрипты
1. `data/scripts/identify-junk.mjs` - выявление мусора/шаблонов/дубликатов
2. `data/scripts/dedup-by-content.mjs` - дедупликация по хешу содержимого
3. `data/scripts/improve-scoring.mjs` - анализ и предложения по scoring
4. `data/scripts/clean-pipeline.mjs` - главный пайплайн очистки

### Конфигурационные файлы
1. `data/scripts/VARIANTS_IGNORE.json` - список вариантов для исключения
2. `data/scripts/DEDUP_PLAN.json` - план дедупликации
3. `data/scripts/SCORING_PROPOSAL.json` - предложения по улучшению scoring

### Отчеты
1. `reports/latest.md` - markdown отчет
2. `reports/latest-*.json` - JSON отчет
3. `variants_features_clean.json` - очищенный датасет

### Новые команды в package.json

```bash
npm run identify:junk      # Выявление мусора/шаблонов
npm run dedup              # Дедупликация по содержимому
npm run improve:scoring    # Анализ и предложения по scoring
npm run analyze:clean      # Полный пайплайн очистки
```

---

## Рекомендации по дальнейшим действиям

### 1. Применить ignore list
Скрипт `analyze-variants.mjs` уже обновлен для учета `VARIANTS_IGNORE.json`. При следующем запуске `npm run analyze` исключенные варианты не будут анализироваться.

### 2. Удалить дубликаты (вручную)
```bash
# Рекомендуемые команды для удаления (выполнить вручную):
git rm -r "data/deterministic-flux-engine (1)"
git rm -r "data/verlet-threads (1)"
git rm -r "data/enginepromt"
```

Или переместить в архив:
```bash
mkdir -p data/_archive
mv "data/deterministic-flux-engine (1)" data/_archive/
mv "data/verlet-threads (1)" data/_archive/
mv "data/enginepromt" data/_archive/
```

### 3. Применить улучшения scoring
Обновить функцию `score()` в `data/scripts/analyze-variants.mjs` согласно `SCORING_PROPOSAL.json`:
- Увеличить вес `has_fixed_timestep` с 1 до 3
- Добавить `has_deterministic_rng` с весом 3
- Добавить `has_stateRef` с весом 2
- Добавить `uses_performance_now` с весом 2
- Добавить штраф `uses_date_now: -2`
- Исключить `has_teal` и `has_red` из scoring

### 4. Итеративный цикл
1. **Анализ:** `npm run analyze`
2. **Очистка:** `npm run analyze:clean`
3. **Выводы:** Изучить `reports/latest.md`
4. **Генерация:** Использовать prompt targets для Gemini
5. **Повтор:** Вернуться к шагу 1

---

## Выводы

1. ✅ **Очистка выполнена:** Исключено 5 вариантов (8.3%), датасет стал чище
2. ✅ **Дубликаты выявлены:** Найдены дубликаты по имени и содержимому
3. ✅ **Качество фич проанализировано:** Выявлены слишком частые и редкие фичи
4. ✅ **Scoring улучшен:** Предложены новые веса и метрики (stability_score, premium_score)
5. ✅ **Пайплайн создан:** Автоматизированный цикл анализа → очистки → выводов → промптов

**Следующий шаг:** Применить улучшения scoring и начать итеративный цикл генерации новых вариантов с учетом prompt targets.

