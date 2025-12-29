# Правила Compliance

> Извлечено из `scripts/analyze-variants.mjs::generateComplianceTable()` (строки 915-950)  
> Дата: 2025-12-29

## Обзор

Compliance (соответствие) - это набор правил, которые определяют, соответствует ли движок лучшим практикам разработки анимационных движков. Каждое правило проверяется независимо и возвращает PASS или FAIL.

## Правила Compliance

### 1. Fixed Timestep

**Имя**: `Fixed Timestep`

**Описание**: Использует фиксированный timestep для стабильной физики

**Проверка**: `has_fixed_timestep === true`

**Почему важно**: 
- Фиксированный timestep обеспечивает стабильность физики независимо от частоты кадров
- Предотвращает артефакты при изменении FPS
- Основа для детерминированной симуляции

**Реализация**: 
- Использование паттерна "Fix Your Timestep" by Glenn Fiedler
- Константа `FIXED_DT = 1/60` или подобная
- Accumulator loop: `while (accumulator >= FIXED_DT) { update(FIXED_DT); accumulator -= FIXED_DT; }`

**Пример**:
```typescript
const FIXED_DT = 1/60;
let accumulator = 0;

function update(dt: number) {
  // Physics update with fixed dt
}

function loop(time: number) {
  const frameTime = (time - lastTime) / 1000;
  lastTime = time;
  accumulator += frameTime;
  
  while (accumulator >= FIXED_DT) {
    update(FIXED_DT);
    accumulator -= FIXED_DT;
  }
  
  render();
  requestAnimationFrame(loop);
}
```

---

### 2. Deterministic RNG

**Имя**: `Deterministic RNG`

**Описание**: Использует детерминированный RNG (seed-based)

**Проверка**: `has_deterministic_rng === true`

**Почему важно**:
- Обеспечивает воспроизводимость симуляции
- Позволяет отлаживать и тестировать с одинаковыми результатами
- Критично для детерминированных симуляций

**Реализация**:
- Использование seed-based RNG (например, `DeterministicRNG`, `SeededRNG`)
- Фиксированный seed для воспроизводимости
- Избегание `Math.random()` в update loop

**Пример**:
```typescript
class DeterministicRNG {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) % 2**32;
    return this.seed / 2**32;
  }
}

const rng = new DeterministicRNG(12345);
```

---

### 3. Performance.now

**Имя**: `Performance.now`

**Описание**: Использует `performance.now()` вместо `Date.now()`

**Проверка**: `uses_performance_now === true`

**Почему важно**:
- `performance.now()` - монотонное высокоточное время
- Не зависит от системных часов (не изменяется при изменении времени системы)
- Предоставляет микросекундную точность
- `Date.now()` может "прыгать" назад при синхронизации времени

**Реализация**:
```typescript
// ✅ Правильно
const now = performance.now();
const dt = (now - lastTime) / 1000;

// ❌ Неправильно
const now = Date.now();
const dt = (now - lastTime) / 1000;
```

---

### 4. No setState in RAF

**Имя**: `No setState in RAF`

**Описание**: Нет setState внутри requestAnimationFrame

**Проверка**: `no_react_state_in_loop === true` И `setState_in_raf === false`

> **Примечание**: `no_react_state_in_loop` вычисляется как `!setState_in_raf`, поэтому проверка фактически дублируется. Достаточно проверять только `setState_in_raf === false`.

**Почему важно**:
- `setState` в RAF вызывает React re-render каждый кадр
- Это критически снижает производительность
- Может привести к лагам и пропуску кадров
- React не оптимизирован для 60 FPS обновлений

**Реализация**:
```typescript
// ✅ Правильно
const stateRef = useRef({ particles: [] });

function loop() {
  // Обновляем stateRef.current, не вызываем setState
  update(stateRef.current);
  render();
  requestAnimationFrame(loop);
}

// ❌ Неправильно
const [particles, setParticles] = useState([]);

function loop() {
  // Это вызывает re-render каждый кадр!
  setParticles(updatedParticles);
  requestAnimationFrame(loop);
}
```

---

### 5. DOM Overlay

**Имя**: `DOM Overlay`

**Описание**: Имеет DOM overlay поверх canvas

**Проверка**: `has_dom_overlay_div === true` ИЛИ `has_overlay_component === true` ИЛИ `has_dom_overlay_text === true`

**Почему важно**:
- Позволяет отображать UI элементы поверх canvas
- Улучшает UX (кнопки, информация, контролы)
- Разделяет логику рендеринга и UI

**Реализация**:
```tsx
// ✅ Правильно
<div className="relative">
  <canvas ref={canvasRef} />
  <div className="absolute top-4 left-4">
    <h1>Engine Status</h1>
    <button onClick={handleClick}>Start</button>
  </div>
</div>
```

---

### 6. Tracks System

**Имя**: `Tracks System`

**Описание**: Имеет систему треков/таймлайна

**Проверка**: `has_tracks_system === true` ИЛИ `has_timeline_file === true`

**Почему важно**:
- Позволяет создавать сложные анимации с ключевыми кадрами
- Обеспечивает временной контроль
- Упрощает создание последовательностей анимаций

**Реализация**:
```typescript
interface Track {
  at: number;
  value: number;
}

const timeline: Track[] = [
  { at: 0, value: 0 },
  { at: 0.5, value: 1 },
  { at: 1, value: 0 }
];

function sample(t: number): number {
  // Interpolate between keyframes
}
```

---

## Compliance Score

**Формула**: `compliance_score = количество PASS правил`

**Максимальный score**: 6 (все правила PASS)

**Минимальный score**: 0 (все правила FAIL)

**Использование**: 
- Ранжирование вариантов по качеству
- Фильтрация вариантов по минимальному compliance
- Анализ распространенности лучших практик

## Примеры

### Пример 1: Полное соответствие (6/6)

```javascript
{
  has_fixed_timestep: true,           // ✅ Fixed Timestep
  has_deterministic_rng: true,         // ✅ Deterministic RNG
  uses_performance_now: true,          // ✅ Performance.now
  no_react_state_in_loop: true,        // ✅ No setState in RAF
  setState_in_raf: false,
  has_dom_overlay_div: true,           // ✅ DOM Overlay
  has_tracks_system: true              // ✅ Tracks System
}
// compliance_score: 6
```

### Пример 2: Частичное соответствие (3/6)

```javascript
{
  has_fixed_timestep: false,           // ❌ Fixed Timestep
  has_deterministic_rng: true,         // ✅ Deterministic RNG
  uses_performance_now: true,          // ✅ Performance.now
  no_react_state_in_loop: true,        // ✅ No setState in RAF
  setState_in_raf: false,
  has_dom_overlay_div: false,          // ❌ DOM Overlay
  has_tracks_system: false             // ❌ Tracks System
}
// compliance_score: 3
```

### Пример 3: Низкое соответствие (1/6)

```javascript
{
  has_fixed_timestep: false,           // ❌ Fixed Timestep
  has_deterministic_rng: false,        // ❌ Deterministic RNG
  uses_performance_now: false,         // ❌ Performance.now
  uses_date_now: true,
  no_react_state_in_loop: true,        // ✅ No setState in RAF
  setState_in_raf: false,
  has_dom_overlay_div: false,          // ❌ DOM Overlay
  has_tracks_system: false             // ❌ Tracks System
}
// compliance_score: 1
```

---

## Связь с ENGINE_CLASS

Compliance правила связаны с классификацией движков:

- **STABLE**: Обычно имеет высокий compliance_score (4-6)
- **NON_COMPLIANT**: Обычно имеет низкий compliance_score (0-2), особенно отсутствие Fixed Timestep
- **NON_DETERMINISTIC**: Обычно имеет низкий compliance_score из-за отсутствия Deterministic RNG или Performance.now
- **INVALID**: Может иметь любой compliance_score, но всегда помечается как INVALID из-за setState_in_raf

---

**См. также**: 
- `spec/classification_rules.md` - правила классификации движков
- `spec/scoring_rules.md` - система скоринга (включает compliance фичи)

