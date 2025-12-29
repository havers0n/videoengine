# Манифест миграции в videoengine-lab

> **Дата создания**: 2025-12-29  
> **Статус**: Архивный репозиторий → Новый репозиторий (videoengine-lab)  
> **Цель**: Извлечение знаний, спецификаций, правил и схем для использования в новом репозитории как единый источник истины

---

## ⚠️ DO NOT COPY LEGACY SEMANTICS (КРИТИЧНО: НЕ КОПИРОВАТЬ)

> **ЖЕСТКОЕ ПРЕДУПРЕЖДЕНИЕ**: Эта секция должна быть прочитана ПЕРЕД началом миграции. Не копируйте эти компоненты "как есть" в новый репозиторий без исправления.

### 🚫 STABLE label is legacy-static and flawed

**НЕ КОПИРОВАТЬ**: Классификация `STABLE` в текущей реализации некорректна:
- STABLE фактически означает "has fixed timestep" (из-за бага в логике)
- SEMI и CHAOTIC недостижимы
- Описание не соответствует реализации

**Действие**: Пересмотреть логику классификации в новом репозитории. Не использовать текущие правила `classifyEngineClass()` без исправления.

---

### 🚫 Lift/scoring_v2 tied to legacy label — recalc only after runtime oracle

**НЕ КОПИРОВАТЬ**: Следующие файлы основаны на некорректной классификации:
- `master/feature_diff_stable_vs_other.json` — Lift-анализ по "STABLE" vs "OTHER" некорректен
- `master/scoring_v2.json` — веса основаны на некорректном Lift
- `master/prompt_constraints.md` — генерируется из некорректных данных

**Действие**: 
1. Исправить классификацию в новом репозитории
2. Создать runtime-oracle для детерминизма
3. Только после этого пересчитать Lift и scoring
4. Не использовать текущие scoring_v2.json и feature_diff без пересчета

---

### 🚫 SEMI/CHAOTIC unreachable — do not reuse rules as-is

**НЕ КОПИРОВАТЬ**: Правила для SEMI и CHAOTIC в `classifyEngineClass()` недостижимы из-за логической ошибки. Не копировать эти правила в новый репозиторий "как есть".

**Действие**: Переписать логику классификации с нуля, учитывая все известные проблемы (см. раздел "Known Issues").

---

### 📋 Checklist перед копированием классификации

- [ ] Прочитан раздел "Known Issues" (раздел 7)
- [ ] Понята проблема с SEMI/CHAOTIC
- [ ] Понята проблема с STABLE semantics
- [ ] Решено, как исправить классификацию в новом репо
- [ ] План пересчета Lift/scoring после исправления
- [ ] Runtime-oracle спроектирован/реализован

**Только после выполнения всех пунктов можно копировать файлы классификации.**

---

## 1. Must Move (Обязательно перенести)

### 1.1. Спецификации и схемы

| Старый путь | Новый путь (videoengine-lab) | Описание | Критичность |
|------------|------------------------------|----------|-------------|
| `master/scoring.json` | `spec/scoring.json` | Версия 2.0.0: веса фич для scoring, rationale (too_common_features, rare_features, stability_features, anti_patterns) | **КРИТИЧНО** |
| `master/scoring_v2.json` | `spec/scoring_v2.json` | Версия 2.1.0: улучшенная формула с Lift-анализом, confidence_weights, formula: `score = Σ(feature_present * log(lift + 1) * confidence_weight * manual_weight)` | **КРИТИЧНО** |
| `master/prompt_constraints.md` | `spec/prompt_constraints.md` | Автоматически сгенерированные системные промпты для Gemini (Hard Constraints, Soft Hints, Negative Constraints) | **КРИТИЧНО** |
| `master/feature_diff_stable_vs_other.json` | `spec/feature_diff_stable_vs_other.json` | Lift-анализ фич: top/bottom фичи, метаданные (total, stable, non_compliant, non_deterministic), используется для генерации prompt constraints | **КРИТИЧНО** |
| `master/ignore.json` | `spec/ignore.json` | Глобальный список вариантов и паттернов для исключения из анализа | **ВАЖНО** |
| `spec/dataset_schema.md` | `spec/dataset_schema.md` | ✅ **СОЗДАН** - схема датасета на основе `master/dataset.json` и `master/features.csv` | **ВАЖНО** |
| `spec/classification_rules.md` | `spec/classification_rules.md` | ✅ **СОЗДАН** - правила классификации на основе `scripts/analyze-variants.mjs::classifyEngineClass()` | **КРИТИЧНО** |
| `spec/scoring_rules.md` | `spec/scoring_rules.md` | ✅ **СОЗДАН** - правила скоринга на основе scoring.json и scoring_v2.json | **ВАЖНО** |
| `spec/feature_catalog.md` | `spec/feature_catalog.md` | ✅ **СОЗДАН** - каталог всех фич на основе `initFeatureRow()` | **КРИТИЧНО** |
| `spec/compliance_rules.md` | `spec/compliance_rules.md` | ✅ **СОЗДАН** - правила compliance на основе `generateComplianceTable()` | **ВАЖНО** |

### 1.2. Правила классификации

| Старый путь | Новый путь | Описание | Критичность |
|------------|-----------|----------|-------------|
| `scripts/analyze-variants.mjs::classifyEngineClass()` (строки 876-910) | `spec/classification_rules.md` | Логика классификации ENGINE_CLASS: INVALID → NON_DETERMINISTIC → NON_COMPLIANT → STABLE → SEMI → CHAOTIC | **КРИТИЧНО** |
| `scripts/analyze-variants.mjs::generateComplianceTable()` (строки 915-950) | `spec/compliance_rules.md` | Таблица compliance правил (Fixed Timestep, Deterministic RNG, Performance.now, No setState in RAF, DOM Overlay, Tracks System) | **ВАЖНО** |

### 1.3. Каталог фич (Feature Catalog)

| Старый путь | Новый путь | Описание | Критичность |
|------------|-----------|----------|-------------|
| `scripts/analyze-variants.mjs::initFeatureRow()` (строки 138-224) | `spec/feature_catalog.md` | Полный список всех детектируемых фич: ARCH, TRACKS & TIMELINE, OVERLAY & UI, INTEGRATOR/TIMESTEP, FORCES, RENDER, и т.д. | **КРИТИЧНО** |
| `scripts/analyze-variants.mjs::analyzeSourceFile()` (строки 247-842) | `spec/feature_detection_rules.md` | Правила детекции фич через AST (ts-morph) и regex паттерны | **ВАЖНО** |

### 1.4. Генераторы и утилиты

| Старый путь | Новый путь | Описание | Критичность |
|------------|-----------|----------|-------------|
| `scripts/generate-prompt-constraints.mjs` | `scripts/generate-prompt-constraints.mjs` | Генератор системных промптов из feature_diff_stable_vs_other.json | **КРИТИЧНО** |
| `scripts/feature-diff.mjs` | `scripts/feature-diff.mjs` | Вычисление Lift-метрик для фич (p_stable, p_other, lift, coverage) | **КРИТИЧНО** |
| `scripts/improve-scoring-v2.mjs` | `scripts/improve-scoring-v2.mjs` | Генератор scoring_v2.json на основе Lift-анализа | **ВАЖНО** |

### 1.5. Фикстуры и тестовые данные

| Старый путь | Новый путь | Описание | Критичность |
|------------|-----------|----------|-------------|
| `master/features.csv` (заголовки) | `spec/features_schema.csv` | Схема CSV с полным списком колонок (для валидации) | **ВАЖНО** |
| `master/features.json` (1-2 примера) | `spec/features_example.json` | Пример структуры feature_events для документации | **ВАЖНО** |

---

## 2. Nice to Move (Желательно перенести)

### 2.1. Утилиты анализа

| Старый путь | Новый путь | Описание | Приоритет |
|------------|-----------|----------|-----------|
| `scripts/process-variants.mjs` | `scripts/process-variants.mjs` | Универсальный обработчик variants_features.json (stats, top, filter, search, signatures, export, compare, novelty, diff) | Средний |
| `scripts/analyze-variants.mjs` | `scripts/analyze-variants.mjs` | AST-анализатор для извлечения фич (можно адаптировать для нового формата) | Средний |
| `scripts/aggregate-master.mjs` | `scripts/aggregate-master.mjs` | Агрегация данных из runs/* в master/ (может быть полезен как шаблон) | Низкий |

### 2.2. Документация

| Старый путь | Новый путь | Описание | Приоритет |
|------------|-----------|----------|-----------|
| `README_RUNS.md` | `docs/README_RUNS.md` | Описание формата runs/ и процесса ингеста | Низкий |
| `DEEP_SYSTEM_ANALYSIS.md` | `docs/DEEP_SYSTEM_ANALYSIS.md` | Глубокий анализ системы (может быть полезен для понимания контекста) | Низкий |
| `ANALYSIS_AND_IMPROVEMENTS.md` | `docs/ANALYSIS_AND_IMPROVEMENTS.md` | Анализ и предложения по улучшению | Низкий |

---

## 3. Do NOT Move (Не переносить)

### 3.1. Объемные артефакты данных

| Путь | Причина |
|------|---------|
| `data/` (все подпапки с вариантами) | Legacy данные, уже мигрированы в `runs/legacy_*` |
| `data_next/`, `data_nextv2/`, `data_nextv3/` | Экспериментальные данные, не являются источником истины |
| `runs/` (все подпапки) | Объемные дампы прогонов, не нужны в новом репозитории |
| `runs__backup_before_fix/` | Резервные копии, не нужны |
| `reports/` | Генерируемые отчеты, не являются спецификацией |
| `snapshots/` | Снимки данных на определенную дату, не являются спецификацией |
| `node_modules/` | Зависимости, не нужны |

### 3.2. Временные и промежуточные файлы

| Путь | Причина |
|------|---------|
| `variants_features.json`, `variants_features.csv` (в корне) | Промежуточные файлы, не являются источником истины |
| `*.csv`, `*.json` (в корне, кроме master/) | Временные файлы анализа |
| `scripts/*.json` (кроме конфигов) | Промежуточные файлы скриптов |

### 3.3. Экспериментальные скрипты

| Путь | Причина |
|------|---------|
| `scripts/identify-junk.mjs` | Утилита для очистки, не является спецификацией |
| `scripts/dedup-by-content.mjs` | Утилита дедупликации, не является спецификацией |
| `scripts/clean-pipeline.mjs` | Утилита очистки, не является спецификацией |
| `scripts/improve-scoring.mjs` | Старая версия, заменена на improve-scoring-v2.mjs |
| `scripts/ingest.mjs` | Специфичен для формата runs/, может не подойти для нового репозитория |
| `scripts/migrate-legacy.mjs` | Одноразовая миграция, не нужна в новом репозитории |

---

## 4. Single Source of Truth Candidates (Кандидаты на единый источник истины)

### 4.1. Классификация (`classifyEngineClass`)

**Расположение**: `scripts/analyze-variants.mjs`, строки 876-910

**Логика**:
1. **INVALID**: `setState_in_raf === true` (критическое нарушение)
2. **NON_DETERMINISTIC**: `uses_date_now === true` ИЛИ (`uses_math_random === true` И `has_deterministic_rng === false`)
3. **NON_COMPLIANT**: `has_fixed_timestep === false`
4. **STABLE**: Есть хотя бы одна стабильная фича (`uses_performance_now`, `has_fixed_timestep`, `has_deterministic_rng`, `has_stateRef`) И `setState_in_raf === false`
5. **SEMI**: `uses_performance_now === true` ИЛИ `uses_ts_from_raf === true`
6. **CHAOTIC**: Всё остальное

**Действие**: Извлечь в `spec/classification_rules.md` с человекочитаемым описанием правил.

### 4.2. Система скоринга

**Расположение**: 
- Конфигурация: `master/scoring.json` (v2.0.0), `master/scoring_v2.json` (v2.1.0)
- Формула: `scripts/analyze-variants.mjs::score()` (строки 969-1014)

**Формула v2.1.0**: 
```
score = Σ(feature_present * log(lift + 1) * confidence_weight * manual_weight)
```

**Действие**: Документировать в `spec/scoring_rules.md` с объяснением версий и формул.

### 4.3. Каталог фич (Feature Catalog)

**Расположение**: `scripts/analyze-variants.mjs::initFeatureRow()` (строки 138-224)

**Категории фич**:
- **ARCH**: `has_raf`, `has_cancel_raf`, `has_canvas_2d`, `has_resize`, `has_stateRef`, `setState_in_raf`, `has_dom_overlay_text`, `no_react_state_in_loop`
- **TRACKS & TIMELINE**: `has_tracks_system`, `has_timeline_file`, `has_keyframe_system`, `has_track_sequencing`
- **OVERLAY & UI**: `has_overlay_component`, `has_dom_overlay_div`, `has_ui_controls`, `has_animation_controls`, `has_component_separation`
- **INTEGRATOR / TIMESTEP**: `has_fixed_timestep`, `uses_performance_now`, `uses_date_now`, `uses_ts_from_raf`, `has_loop_mod`, `has_deterministic_rng`
- **FORCES**: `force_spring`, `force_attract_to_center`, `force_repulse`, `force_noise_jitter`, `force_damping_mul`, `force_velocity_clamp`
- **RENDER**: `has_shadow_blur`, `has_trails`, `has_gradients`, `has_teal`, `has_red`, и т.д.

**Действие**: Извлечь в `spec/feature_catalog.md` с описанием каждой фичи.

### 4.4. Генератор prompt constraints

**Расположение**: `scripts/generate-prompt-constraints.mjs`

**Входные данные**: `master/feature_diff_stable_vs_other.json`

**Выходные данные**: `master/prompt_constraints.md`

**Логика**:
- **Hard Constraints**: Lift > 100 или абсолютные gatekeepers (например, `has_fixed_timestep` с Lift=999)
- **Soft Hints**: 2 < Lift <= 100
- **Negative Constraints**: Анти-паттерны (`setState_in_raf`, `uses_date_now`, `uses_math_random`) + фичи с низким Lift (< 0.5)

**Действие**: Перенести скрипт и его конфигурацию (`FEATURE_INSTRUCTIONS`, `ANTI_PATTERNS`).

### 4.5. Feature Diff / Lift Analysis

**Расположение**: `scripts/feature-diff.mjs`

**Входные данные**: `master/features.csv` (с колонкой `ENGINE_CLASS`)

**Выходные данные**: `master/feature_diff_stable_vs_other.json`

**Метрики**:
- `p_stable`: вероятность фичи в классе STABLE
- `p_other`: вероятность фичи в классе OTHER (не STABLE)
- `lift = p_stable / p_other` (если p_other === 0, то lift = 999)
- `coverage`: процент вариантов, где фича встречается

**Действие**: Перенести скрипт и его логику.

---

## 5. Репозиторий: Снимок структуры

### 5.1. Основные директории

| Директория | Содержимое | Тип артефакта |
|-----------|-----------|---------------|
| `master/` | Агрегированный датасет, конфигурации, схемы | **Знание** |
| `scripts/` | Скрипты анализа, генерации, обработки | **Знание** (частично) |
| `data/`, `data_next/`, `data_nextv2/`, `data_nextv3/` | Legacy варианты движков | **Временный** |
| `runs/` | Прогоны генерации (run-based формат) | **Временный** |
| `reports/` | Генерируемые отчеты | **Временный** |
| `snapshots/` | Снимки данных на дату | **Временный** |
| `spec/` | **НОВАЯ** - извлеченные спецификации | **Знание** |

### 5.2. Ключевые файлы в master/

| Файл | Размер | Описание | Тип |
|------|--------|----------|-----|
| `dataset.json` | ~22K строк | Агрегированный датасет всех вариантов | Данные |
| `features.json` | ~16K строк | Массив объектов с `run_id`, `variant`, `feature_events` | Данные |
| `features.csv` | 72 строки | CSV с boolean-фичами и ENGINE_CLASS | Данные |
| `features.jsonl` | - | JSONL версия features.json | Данные |
| `scoring.json` | 72 строки | Версия 2.0.0: веса фич | **Спецификация** |
| `scoring_v2.json` | 83 строки | Версия 2.1.0: улучшенная формула | **Спецификация** |
| `prompt_constraints.md` | 73 строки | Системные промпты для Gemini | **Спецификация** |
| `feature_diff_stable_vs_other.json` | 517 строк | Lift-анализ фич | **Спецификация** |
| `ignore.json` | 22 строки | Список исключений | **Спецификация** |
| `README.md` | - | Описание master/ | Документация |

### 5.3. Ключевые скрипты

| Скрипт | Назначение | Критичность |
|--------|-----------|-------------|
| `analyze-variants.mjs` | AST-анализ вариантов, извлечение фич, классификация, scoring | **КРИТИЧНО** (логика) |
| `generate-prompt-constraints.mjs` | Генерация системных промптов из feature_diff | **КРИТИЧНО** |
| `feature-diff.mjs` | Вычисление Lift-метрик | **КРИТИЧНО** |
| `improve-scoring-v2.mjs` | Генерация scoring_v2.json | **ВАЖНО** |
| `process-variants.mjs` | Утилиты обработки variants_features.json | Средний |
| `aggregate-master.mjs` | Агрегация данных из runs/ | Низкий |

---

## 6. План миграции

### Этап 1: Извлечение спецификаций (в старом репозитории) ✅ ЗАВЕРШЕНО

1. ✅ Создать `spec/` директорию
2. ✅ Создать `spec/dataset_schema.md` на основе `master/dataset.json` и `master/features.csv`
3. ✅ Создать `spec/classification_rules.md` на основе `classifyEngineClass()`
4. ✅ Создать `spec/scoring_rules.md` на основе scoring.json и scoring_v2.json
5. ✅ Создать `spec/feature_catalog.md` на основе `initFeatureRow()`
6. ✅ Создать `spec/compliance_rules.md` на основе `generateComplianceTable()`
7. ✅ Создать `MIGRATION_MANIFEST.md` с полным планом миграции
8. ✅ Обновить `README.md` с пометкой об архивации

### Этап 2: Копирование файлов (в новый репозиторий)

1. Скопировать `master/scoring.json` → `spec/scoring.json`
2. Скопировать `master/scoring_v2.json` → `spec/scoring_v2.json`
3. Скопировать `master/prompt_constraints.md` → `spec/prompt_constraints.md`
4. Скопировать `master/feature_diff_stable_vs_other.json` → `spec/feature_diff_stable_vs_other.json`
5. Скопировать `master/ignore.json` → `spec/ignore.json`
6. Скопировать `spec/*.md` (все созданные спецификации)
7. Скопировать `scripts/generate-prompt-constraints.mjs` → `scripts/generate-prompt-constraints.mjs`
8. Скопировать `scripts/feature-diff.mjs` → `scripts/feature-diff.mjs`
9. Скопировать `scripts/improve-scoring-v2.mjs` → `scripts/improve-scoring-v2.mjs`

### Этап 3: Адаптация (в новом репозитории)

1. Обновить пути в скриптах (если структура отличается)
2. Обновить зависимости (если используются другие пакеты)
3. Создать тесты для критичных компонентов (классификация, scoring, генерация промптов)
4. Документировать API и использование

---

## 7. Known Issues (Известные проблемы, переносимые из legacy)

> **КРИТИЧНО**: Эти проблемы должны быть исправлены в новом репозитории. Они задокументированы здесь, чтобы не потерять контекст при миграции.

### 7.1. Классификация: SEMI и CHAOTIC недостижимы

**Проблема**: В `scripts/analyze-variants.mjs::classifyEngineClass()` (строки 876-910) классы **SEMI** и **CHAOTIC** фактически недостижимы из-за логической ошибки.

**Причина**:
1. Шаг 3: если `has_fixed_timestep === false`, возвращаем `NON_COMPLIANT`
2. Шаг 4: проверяем `hasStabilityFeature = uses_performance_now || has_fixed_timestep || has_deterministic_rng || has_stateRef`
3. Если дошли до шага 4, значит `has_fixed_timestep === true` (иначе бы вышли на шаге 3)
4. Поэтому `hasStabilityFeature` всегда true (т.к. `has_fixed_timestep` входит в OR)
5. STABLE срабатывает всегда, SEMI и CHAOTIC никогда не достигаются

**Последствия**:
- Lift-анализ в `master/feature_diff_stable_vs_other.json` некорректен (STABLE фактически = "has fixed timestep")
- `scoring_v2.json` основан на некорректном Lift
- `prompt_constraints.md` генерируется из некорректных данных

**Рекомендация для нового репозитория**:
- Пересмотреть логику классификации
- Разделить статическую эвристику (STATIC_COMPLIANT) и runtime-детерминизм (RUNTIME_DETERMINISTIC)
- Пересчитать Lift после исправления классификации
- Рассмотреть предложенную схему:
  - `STATIC_COMPLIANT`: `has_fixed_timestep && !setState_in_raf && !nondet_sources_in_loop`
  - `RUNTIME_DETERMINISTIC`: только по runtime-оракулу
  - `SEMI`: `!has_fixed_timestep` но "нормальное время" (performance.now / raf ts) и нет явных nondet
  - `CHAOTIC`: всё остальное

**Ссылки**: `spec/classification_rules.md` раздел "Known Issues"

---

### 7.2. Семантическая несостыковка STABLE

**Проблема**: В `spec/dataset_schema.md` STABLE описан как "стабильные движки с фиксированным timestep и детерминированным RNG", но правила допускают STABLE даже при отсутствии deterministic RNG (достаточно fixed timestep).

**Рекомендация**: Выбрать одно определение и сделать единым во всех спеках.

**Ссылки**: `spec/dataset_schema.md`, `spec/classification_rules.md`

---

### 7.3. Compliance: дублирование проверки "No setState in RAF"

**Проблема**: В `generateComplianceTable()` проверка: `no_react_state_in_loop && !row.setState_in_raf`, но `no_react_state_in_loop` вычисляется как `!setState_in_raf`, поэтому проверка дублируется.

**Рекомендация**: Оставить одно поле (лучше `setState_in_raf` как первичный сигнал), `no_react_state_in_loop` убрать из набора "истины", оставить как derived.

**Ссылки**: `spec/compliance_rules.md`, `scripts/analyze-variants.mjs::generateComplianceTable()` (строка 934)

---

### 7.4. Feature Catalog: расплывчатые детекции

**Проблема**: Некоторые детекции выглядят как "правдоподобные", но не доказано что реальные:
- `has_loop_mod`: "Regex: loop или mod в контексте времени" — очень расплывчато, может давать шум
- `force_noise_jitter`: "vx += randomRange или vy += Math.random" — смешение семантики "джиттер" и "недетерминизм". Если там Math.random, это уже `uses_math_random`

**Рекомендация**: `spec/feature_catalog.md` должен ссылаться на конкретные паттерны/регексы/AST-правила из кода, иначе это не каталог, а рассказ.

**Ссылки**: `spec/feature_catalog.md`, `scripts/analyze-variants.mjs::analyzeSourceFile()`

---

### 7.5. Scoring v2.1.0: круговая зависимость от Lift по "STABLE"

**Проблема**: Если STABLE статический и потенциально всегда-true (см. п.7.1), то:
- Lift будет мусор
- scoring_v2 будет мусор
- prompt constraints будут мусор

**Рекомендация**: 
1. Исправить определения классов (или переименовать)
2. Сделать runtime-oracle
3. Только потом пересчитывать Lift по runtime-метке

**Ссылки**: `master/scoring_v2.json`, `master/feature_diff_stable_vs_other.json`, `scripts/feature-diff.mjs`

---

## 8. Примечания

- **Версионирование**: scoring.json и scoring_v2.json должны сохранить версии для отслеживания изменений
- **Обратная совместимость**: Новый репозиторий должен поддерживать чтение старых форматов (scoring.json v2.0.0)
- **Расширяемость**: Спецификации должны быть расширяемыми (новые фичи, новые правила классификации)
- **Валидация**: В новом репозитории должна быть валидация входных данных по схемам из spec/

---

## 9. Контакты и вопросы

При возникновении вопросов по миграции обращаться к:
- Документации в `spec/`
- Исходному коду в `scripts/`
- Комментариям в коде (особенно в `analyze-variants.mjs`)

---

**Конец манифеста**

