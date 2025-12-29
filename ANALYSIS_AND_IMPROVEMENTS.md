# Анализ проекта и реализованные улучшения

> Дата: 2025-01-29
> Автор: Senior Developer Analysis

## Ответ на ключевой вопрос: Как определяется STABLE?

**Классификация основана на rule-based статическом AST-анализе кода, а не на runtime-тестах.**

### Текущая логика классификации (`classifyEngineClass`):

1. **INVALID** (критическое нарушение):
   - `setState_in_raf === true` → setState вызывается в RAF loop

2. **NON_DETERMINISTIC**:
   - `uses_date_now === true` ИЛИ
   - `uses_math_random === true && has_deterministic_rng === false`

3. **NON_COMPLIANT** (обязательное требование):
   - `has_fixed_timestep === false` → **Абсолютный gatekeeper**

4. **STABLE**:
   - `has_fixed_timestep === true` И
   - (`uses_performance_now === true` ИЛИ `has_deterministic_rng === true` ИЛИ `has_stateRef === true`) И
   - `setState_in_raf === false`

5. **SEMI**: `uses_performance_now || uses_ts_from_raf` (без fixed timestep)

6. **CHAOTIC**: всё остальное

**Вывод**: Классификация основана на статических паттернах кода, а не на выполнении с одинаковым seed и сравнении хэшей. Это означает, что:
- ✅ Быстро и автоматически
- ❌ Может пропустить runtime-проблемы (например, если тесты короткие)
- ❌ Не проверяет фактическую детерминированность на длинной дистанции

---

## Реализованные улучшения

### 1. ✅ Генератор Prompt Constraints (`scripts/generate-prompt-constraints.mjs`)

**Цель**: Автоматически генерировать системный промпт для Gemini на основе анализа `feature_diff_stable_vs_other.json`.

**Функциональность**:
- **Hard Constraints** (Lift > 100): Обязательные требования
  - `has_fixed_timestep` → "You MUST use a fixed timestep approach..."
- **Soft Hints** (2 < Lift <= 100): Рекомендации
  - `has_clusters`, `force_noise_jitter` → рекомендации с объяснениями
- **Negative Constraints**: Явные запреты
  - `setState_in_raf`, `uses_date_now`, `uses_math_random` → анти-паттерны

**Использование**:
```bash
node scripts/generate-prompt-constraints.mjs
# Результат: master/prompt_constraints.md
```

**Следующие шаги**:
- Интегрировать Hard Constraints в системный промпт для новых runs
- Использовать Soft Hints как рекомендации в промпте
- Добавить Negative Constraints в список запретов

---

### 2. ✅ Улучшенная формула Scoring (`scripts/improve-scoring-v2.mjs`)

**Проблема**: Текущая формула scoring не учитывает Lift и Confidence из статистического анализа.

**Решение**: Новая формула с логарифмированием экстремальных значений:

```
score = Σ(feature_present * log(lift + 1) * confidence_weight * manual_weight)
```

**Преимущества**:
- Логарифмирование сглаживает экстремальные значения (lift=999 → log(1000) ≈ 6.9)
- Коэффициент доверия (confidence) для спорных фич (например, `force_noise_jitter: 0.5`)
- Сохранение ручных весов из `scoring.json` где они отличаются значительно

**Использование**:
```bash
node scripts/improve-scoring-v2.mjs
# Результат: master/scoring_v2.json (предложение)
```

**Статус**: Предложение для review. Не применено автоматически (требует валидации).

---

### 3. ⚠️ Проверка несидированного Math.random() в force_noise_jitter

**Проблема**: `force_noise_jitter` с Lift=4.57 может быть несидированным Math.random(), что приведет к недетерминированности на длинной дистанции.

**Текущий статус**: 
- ✅ Детекция `force_noise_jitter` существует (regex: `v += randomRange|Math.random`)
- ❌ Нет проверки, используется ли детерминированный RNG в том же контексте

**Рекомендация для реализации**:
Добавить AST-анализ, который проверяет:
1. Если найден `force_noise_jitter` (v += Math.random/randomRange)
2. Проверить, используется ли в том же файле/функции детерминированный RNG (seed-based)
3. Добавить фичу `force_noise_jitter_non_deterministic: boolean` для предупреждения

**Сложность**: Высокая (требует контекстного AST-анализа)

---

## Планируемые улучшения (не реализованы)

### 4. Синтетическое увеличение STABLE вариантов

**Метод**: 
- Взять 7 успешных STABLE вариантов
- Попросить Gemini сделать рефакторинг/вариации (изменить имена, разбить функции)
- Сохранить логику, изменить форму

**Цель**: Наполнить кластер STABLE и уточнить веса признаков

**Статус**: Требует ручного запуска через Gemini API

---

### 5. Расширение AST-анализа

**Предложенные улучшения**:

#### a) State Isolation
- Проверка: отделено ли состояние (state) от представления (view)
- Если рендер меняет state → NON_DETERMINISTIC

#### b) Complexity Metrics
- Цикломатическая сложность функции update
- Слишком простые (пустые) или слишком сложные функции → флаги

#### c) Forbidden Tokens в Update Loop
- Проверка на `Date.now()`, `performance.now()`, `Math.random()` внутри логики обновления
- Должны быть вынесены или обернуты

**Статус**: Требует расширения `analyze-variants.mjs`

---

## Рекомендации по использованию feature_diff

### Замыкание цикла (Feedback Loop)

**Стратегия Prompt Engineering Injection**:

1. **Hard Constraints** (из `feature_diff`) → в System Prompt:
   ```
   You MUST use a fixed timestep approach with accumulator loop...
   ```

2. **Soft Hints** (Lift > 2) → в User Prompt или System Prompt как рекомендации:
   ```
   It is recommended to organize entities into clusters for stability.
   ```

3. **Negative Constraints** (анти-паттерны) → в System Prompt как запреты:
   ```
   Do NOT use setTimeout for the game loop.
   Do NOT call setState inside requestAnimationFrame.
   ```

**Автоматизация**:
- Запускать `generate-prompt-constraints.mjs` после каждого обновления `feature_diff`
- Включать Hard Constraints в системный промпт для всех новых runs
- Обновлять Negative Constraints при обнаружении новых анти-паттернов

---

## Проблема малых данных (Imbalanced Classes)

**Текущая ситуация**: 7 STABLE из 71 (≈10%)

**Риски**:
- Статистика (Lift, вероятности) может быть шумной
- Один случайный успешный прогон с редким признаком может неоправданно задрать его вес

**Решения**:
1. ✅ Логарифмирование в scoring (сглаживает экстремальные значения)
2. ✅ Коэффициенты доверия для спорных фич
3. ⚠️ Синтетическое увеличение STABLE (требует реализации)
4. ⚠️ Валидация на runtime-тестах (опционально, для проверки статического анализа)

---

## Критические находки из feature_diff

### 1. `has_fixed_timestep` (Lift: 999) - АБСОЛЮТНЫЙ GATEKEEPER

**Вывод**: Этот признак больше не должен быть вероятностным в промпте. Его нужно жестко зашить в System Prompt как обязательное требование.

**Статус**: ✅ Уже реализовано в `classifyEngineClass` (строка 890) - отсутствие → NON_COMPLIANT

**Действие**: ✅ Добавлено в Hard Constraints в `generate-prompt-constraints.mjs`

---

### 2. `has_accumulator_loop` (Lift: 64) - Классический паттерн

**Вывод**: Высокий Lift подтверждает, что LLM иногда пытается имитировать физику без аккумулятора, что приводит к недетерминированному поведению.

**Рекомендация**: Добавить в Hard Constraints (но это уже покрыто через `has_fixed_timestep`)

---

### 3. `force_noise_jitter` (Lift: 4.57) - СПОРНАЯ ФИЧА

**Гипотеза**: Стабильные варианты используют детерминированный джиттер (на основе сида) для предотвращения "залипания" физики.

**Риск**: Если джиттер использует `Math.random()`, вариант может быть помечен как STABLE ошибочно (если тесты коротки).

**Действие**: 
- ✅ Добавлен confidence_weight: 0.5 в `improve-scoring-v2.mjs`
- ⚠️ Требуется AST-проверка на несидированный рандом (не реализовано)

---

## Следующие шаги

### Приоритет 1 (Критично):
1. ✅ Реализовано: Генератор prompt constraints
2. ✅ Реализовано: Улучшенная формула scoring (предложение)
3. ⚠️ Требуется: Review и применение `scoring_v2.json`

### Приоритет 2 (Важно):
4. ⚠️ Реализовать: AST-проверка несидированного Math.random() в force_noise_jitter
5. ⚠️ Реализовать: Синтетическое увеличение STABLE вариантов
6. ⚠️ Реализовать: Расширение AST-анализа (State Isolation, Complexity Metrics)

### Приоритет 3 (Желательно):
7. Опционально: Runtime-тесты для валидации статического анализа
8. Опционально: Визуальная оценка для подтверждения STABLE

---

## Файлы и команды

### Новые скрипты:
- `scripts/generate-prompt-constraints.mjs` - генерация prompt constraints из feature_diff
- `scripts/improve-scoring-v2.mjs` - улучшенная формула scoring с Lift

### Новые файлы (результаты):
- `master/prompt_constraints.md` - системный промпт для Gemini
- `master/scoring_v2.json` - предложение улучшенного scoring

### Команды:
```bash
# Генерация prompt constraints
node scripts/generate-prompt-constraints.mjs

# Генерация улучшенного scoring
node scripts/improve-scoring-v2.mjs
```

