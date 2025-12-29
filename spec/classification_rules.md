# Правила классификации движков

> Извлечено из `scripts/analyze-variants.mjs::classifyEngineClass()` (строки 876-910)  
> Дата: 2025-12-29

## Обзор

Функция `classifyEngineClass(row)` классифицирует движки на основе их характеристик в следующие классы:

1. **INVALID** - Критически невалидные
2. **NON_DETERMINISTIC** - Не детерминированные
3. **NON_COMPLIANT** - Не соответствуют требованиям
4. **STABLE** - Стабильные
5. **SEMI** - Частично стабильные
6. **CHAOTIC** - Хаотичные

> **⚠️ KNOWN BUG**: В текущей реализации (строки 876-910) классы **SEMI** и **CHAOTIC** фактически недостижимы из-за логической ошибки. См. раздел "Known Issues" ниже.

## Правила классификации (по приоритету)

### 1. INVALID (Критическое нарушение)

**Условие**: `setState_in_raf === true`

**Описание**: Движок вызывает React state setters (setState, useState setters) внутри requestAnimationFrame или анимационного цикла. Это критическое нарушение производительности, так как вызывает React re-renders каждый кадр.

**Действие**: Движок помечается как INVALID независимо от других характеристик.

---

### 2. NON_DETERMINISTIC (Не детерминированный)

**Условие**: 
- `uses_date_now === true` ИЛИ
- (`uses_math_random === true` И `has_deterministic_rng === false`)

**Описание**: Движок использует недетерминированные источники времени или случайности:
- `Date.now()` - не монотонный, зависит от системного времени
- `Math.random()` без детерминированного RNG - непредсказуемая случайность

**Последствия**: Симуляция не воспроизводима, результаты зависят от времени выполнения.

---

### 3. NON_COMPLIANT (Не соответствует требованиям)

**Условие**: `has_fixed_timestep === false`

**Описание**: Движок не использует фиксированный timestep. Это критическое требование для стабильной физики (см. "Fix Your Timestep" by Glenn Fiedler).

**Последствия**: Физика зависит от частоты кадров, возможны артефакты при изменении FPS.

---

### 4. STABLE (Стабильный)

**Условие (текущая реализация)**: 
- Есть хотя бы одна стабильная фича:
  - `uses_performance_now === true` ИЛИ
  - `has_fixed_timestep === true` ИЛИ
  - `has_deterministic_rng === true` ИЛИ
  - `has_stateRef === true`
- И `setState_in_raf === false` (не INVALID)

> **⚠️ BUG**: Если мы дошли до этого шага, то `has_fixed_timestep === true` (иначе бы вышли на шаге 3 как NON_COMPLIANT). А `has_fixed_timestep` входит в OR-условие, поэтому STABLE срабатывает всегда, делая SEMI и CHAOTIC недостижимыми.

**Описание**: Движок использует стабильные паттерны:
- `performance.now()` - монотонное высокоточное время
- Фиксированный timestep - стабильная физика
- Детерминированный RNG - воспроизводимая случайность
- `useRef` для состояния - избегает React re-renders

**Характеристики**: Воспроизводимый, стабильный, производительный.

**Примечание**: В описании датасета указано "стабильные движки с фиксированным timestep и детерминированным RNG", но текущая реализация допускает STABLE даже при отсутствии deterministic RNG (достаточно fixed timestep). Это семантическая несостыковка.

---

### 5. SEMI (Частично стабильный)

**Условие**: 
- `uses_performance_now === true` ИЛИ
- `uses_ts_from_raf === true`
- И не попадает в предыдущие категории

> **⚠️ UNREACHABLE**: Этот класс недостижим в текущей реализации, так как если `has_fixed_timestep === true`, то STABLE сработает раньше. А если `has_fixed_timestep === false`, то мы выходим как NON_COMPLIANT на шаге 3.

**Описание**: Движок использует правильные источники времени, но может не иметь других стабильных паттернов (например, нет fixed timestep или deterministic RNG).

**Характеристики**: Частично стабильный, но не полностью оптимизирован.

---

### 6. CHAOTIC (Хаотичный)

**Условие**: Всё остальное (не попадает в предыдущие категории)

> **⚠️ UNREACHABLE**: Этот класс недостижим в текущей реализации по той же причине, что и SEMI.

**Описание**: Движок не использует стабильные паттерны, может иметь проблемы с производительностью и воспроизводимостью.

**Характеристики**: Нестабильный, непредсказуемый, может иметь проблемы с производительностью.

---

## Диаграмма принятия решений

```
┌─────────────────┐
│  setState_in_raf?│
└────────┬────────┘
         │ YES
         ▼
    ┌─────────┐
    │ INVALID │
    └─────────┘

         │ NO
         ▼
┌─────────────────────────────┐
│ uses_date_now OR             │
│ (uses_math_random AND        │
│  NOT has_deterministic_rng)? │
└────────┬─────────────────────┘
         │ YES
         ▼
┌──────────────────┐
│ NON_DETERMINISTIC│
└──────────────────┘

         │ NO
         ▼
┌──────────────────────┐
│ has_fixed_timestep?  │
└────────┬─────────────┘
         │ NO
         ▼
┌──────────────────┐
│ NON_COMPLIANT    │
└──────────────────┘

         │ YES
         ▼
┌──────────────────────────────────────┐
│ uses_performance_now OR              │
│ has_fixed_timestep OR                │
│ has_deterministic_rng OR             │
│ has_stateRef?                        │
└────────┬─────────────────────────────┘
         │ YES
         ▼
┌─────────┐
│ STABLE │
└─────────┘

         │ NO
         ▼
┌─────────────────────────────┐
│ uses_performance_now OR     │
│ uses_ts_from_raf?           │
└────────┬────────────────────┘
         │ YES
         ▼
┌────────┐
│ SEMI  │
└────────┘

         │ NO
         ▼
┌──────────┐
│ CHAOTIC  │
└──────────┘
```

## Примеры

### Пример 1: STABLE
```javascript
{
  has_fixed_timestep: true,
  has_deterministic_rng: true,
  uses_performance_now: true,
  has_stateRef: true,
  setState_in_raf: false
}
// → ENGINE_CLASS: "STABLE"
```

### Пример 2: NON_DETERMINISTIC
```javascript
{
  uses_date_now: true,
  has_fixed_timestep: false,
  setState_in_raf: false
}
// → ENGINE_CLASS: "NON_DETERMINISTIC"
```

### Пример 3: NON_COMPLIANT
```javascript
{
  has_fixed_timestep: false,
  uses_performance_now: true,
  setState_in_raf: false
}
// → ENGINE_CLASS: "NON_COMPLIANT"
```

### Пример 4: INVALID
```javascript
{
  setState_in_raf: true,
  has_fixed_timestep: true,
  uses_performance_now: true
}
// → ENGINE_CLASS: "INVALID" (приоритет над остальными)
```

---

## Примечания

- Классификация выполняется в порядке приоритета (сверху вниз)
- Первое совпадение определяет класс
- INVALID имеет наивысший приоритет
- STABLE требует комбинации стабильных паттернов
- Классификация может быть расширена новыми правилами

---

## Known Issues

### 1. SEMI и CHAOTIC недостижимы

**Проблема**: В текущей реализации `classifyEngineClass()` (строки 876-910) классы SEMI и CHAOTIC фактически недостижимы.

**Причина**: 
- Шаг 3: если `has_fixed_timestep === false`, возвращаем `NON_COMPLIANT`
- Шаг 4: проверяем `hasStabilityFeature` (включает `has_fixed_timestep` в OR)
- Если дошли до шага 4, значит `has_fixed_timestep === true`
- Поэтому `hasStabilityFeature` всегда true, и STABLE срабатывает всегда
- SEMI и CHAOTIC никогда не достигаются

**Последствия**:
- Lift-анализ по "STABLE" vs "OTHER" некорректен (STABLE фактически = "has fixed timestep")
- scoring_v2.json основан на некорректном Lift
- prompt constraints генерируются из некорректных данных

**Рекомендация для нового репозитория**:
- Пересмотреть логику классификации
- Разделить статическую эвристику (STATIC_COMPLIANT) и runtime-детерминизм (RUNTIME_DETERMINISTIC)
- Пересчитать Lift после исправления классификации

### 2. Семантическая несостыковка STABLE

**Проблема**: В `spec/dataset_schema.md` STABLE описан как "стабильные движки с фиксированным timestep и детерминированным RNG", но правила допускают STABLE даже при отсутствии deterministic RNG (достаточно fixed timestep).

**Рекомендация**: Выбрать одно определение и сделать единым во всех спеках.

---

**См. также**: `spec/compliance_rules.md` для детальных правил compliance

