# Правила скоринга движков

> Извлечено из `master/scoring.json` (v2.0.0) и `master/scoring_v2.json` (v2.1.0)  
> Дата: 2025-12-29

## Обзор

Система скоринга оценивает качество движков на основе наличия/отсутствия определенных фич. Каждая фича имеет вес, который добавляется или вычитается из итогового балла.

## Версии

### v2.0.0 (scoring.json)

**Формула**: `score = Σ(feature_present * weight)`

Простая сумма весов для присутствующих фич.

### v2.1.0 (scoring_v2.json)

**Формула**: `score = Σ(feature_present * log(lift + 1) * confidence_weight * manual_weight)`

Улучшенная формула с учетом:
- **Lift**: Корреляция фичи с классом STABLE (из `feature_diff_stable_vs_other.json`)
- **Confidence weight**: Коэффициент доверия для спорных фич
- **Manual weight**: Ручная настройка веса (из scoring.json)

**Преимущества**:
- Логарифмическое масштабирование предотвращает доминирование экстремальных значений (например, lift=999)
- Учет Lift делает scoring более объективным
- Confidence weights снижают влияние спорных фич

## Веса фич (v2.1.0)

### Архитектурные фичи

| Фича | Вес | Описание |
|------|-----|----------|
| `has_canvas_2d` | 1 | Использует Canvas 2D context |
| `has_raf` | 1 | Использует requestAnimationFrame |
| `setState_in_raf` | **-20** | **Анти-паттерн**: setState в RAF |
| `has_stateRef` | 3 | Использует useRef для состояния |
| `no_react_state_in_loop` | 5 | Compliance: нет setState в loop |
| `has_cancel_raf` | 1 | Использует cancelAnimationFrame |
| `has_resize` | 1 | Обрабатывает resize события |

### Timestep и детерминизм

| Фича | Вес | Описание |
|------|-----|----------|
| `has_fixed_timestep` | **17** | Фиксированный timestep (критично) |
| `has_deterministic_rng` | 9 | Детерминированный RNG (seed-based) |
| `uses_performance_now` | 8 | Использует performance.now() |
| `uses_date_now` | **-7** | **Анти-паттерн**: использует Date.now() |
| `uses_ts_from_raf` | -1 | Timestamp из RAF callback |

### Силы и физика

| Фича | Вес | Описание |
|------|-----|----------|
| `force_spring` | 2 | Пружинные силы |
| `force_damping_mul` | 2 | Демпфирование |
| `force_noise_jitter` | 1 | Шум/дрожание (confidence: 0.5) |
| `force_attract_to_center` | 0.86 | Притяжение к центру |
| `force_repulse` | 0.91 | Отталкивание |

### Визуальные эффекты

| Фича | Вес | Описание |
|------|-----|----------|
| `has_threads` | 2 | Потоки/соединения |
| `has_clusters` | 2 | Кластеры частиц |
| `has_trails` | 2 | Следы частиц |
| `has_shadow_blur` | 2 | Тени и размытие |
| `has_gradients` | 1 | Градиенты |
| `has_hotspots` | 1 | Горячие точки |
| `has_scan_ring` | 1 | Кольцо сканирования (confidence: 0.7) |
| `has_teal` | -1 | Цвет teal/cyan |
| `has_red` | 2 | Красный цвет |

### Tracks и Timeline

| Фича | Вес | Описание |
|------|-----|----------|
| `has_tracks_system` | 8 | Система треков/анимации |
| `has_timeline_file` | 6 | Файл Timeline.ts |
| `has_keyframe_system` | 5 | Система keyframes |
| `has_track_sequencing` | 4 | Последовательность треков |

### UI и Overlay

| Фича | Вес | Описание |
|------|-----|----------|
| `has_overlay_component` | 8 | Компонент Overlay.tsx |
| `has_dom_overlay_div` | 4 | div с position absolute/fixed |
| `has_ui_controls` | 3 | Кнопки, слайдеры, UI элементы |
| `has_animation_controls` | 4 | Контролы play/pause/stop |
| `has_component_separation` | 3 | Отдельные компоненты UI и canvas |

## Confidence Weights (v2.1.0)

Некоторые фичи имеют пониженный коэффициент доверия:

| Фича | Confidence | Причина |
|------|-----------|---------|
| `force_noise_jitter` | 0.5 | Спорная фича - может быть несидированной |
| `has_scan_ring` | 0.7 | Средняя уверенность |
| Остальные | 1.0 | Полная уверенность |

## Rationale (Обоснование)

### Too Common Features (Слишком распространенные)

Эти фичи встречаются почти во всех вариантах, поэтому имеют низкий вес:
- `has_raf`
- `has_cancel_raf`
- `has_canvas_2d`
- `has_resize`
- `pass_particles`
- `has_teal`
- `has_red`

### Rare Features (Редкие фичи)

Эти фичи встречаются редко, но важны для качества:
- `setState_in_raf` (анти-паттерн)
- `has_dom_overlay_text`
- `has_fixed_timestep`
- `uses_date_now` (анти-паттерн)
- `force_spring`
- `force_noise_jitter`
- `force_damping_mul`
- `has_smoothstep`
- `has_clusters`
- `has_scan_ring`

### Stability Features (Фичи стабильности)

Критически важные для стабильности:
- `has_fixed_timestep`
- `has_deterministic_rng`
- `has_stateRef`
- `uses_performance_now`

### Anti-Patterns (Анти-паттерны)

Паттерны, которые должны быть запрещены:
- `setState_in_raf` (вес: -20)
- `uses_date_now` (вес: -7)
- `no_deterministic_rng` (отсутствие детерминированного RNG при использовании случайности)

## Примеры расчета

### Пример 1: STABLE движок

```javascript
{
  has_fixed_timestep: true,        // +17
  has_deterministic_rng: true,     // +9
  uses_performance_now: true,      // +8
  has_stateRef: true,              // +3
  has_clusters: true,              // +2
  has_trails: true,                // +2
  has_canvas_2d: true,             // +1
  has_raf: true,                   // +1
  has_resize: true,                // +1
  setState_in_raf: false,          // 0 (не штраф)
  uses_date_now: false             // 0 (не штраф)
}
// Итоговый score: 44
```

### Пример 2: NON_DETERMINISTIC движок

```javascript
{
  has_fixed_timestep: false,       // 0
  uses_date_now: true,             // -7
  uses_math_random: true,          // 0 (не учитывается напрямую)
  has_deterministic_rng: false,    // 0
  has_canvas_2d: true,             // +1
  has_raf: true,                   // +1
  setState_in_raf: false           // 0
}
// Итоговый score: -5
```

### Пример 3: INVALID движок

```javascript
{
  setState_in_raf: true,            // -20
  has_fixed_timestep: true,        // +17
  has_deterministic_rng: true,     // +9
  has_canvas_2d: true,             // +1
  has_raf: true                    // +1
}
// Итоговый score: -20 + 17 + 9 + 1 + 1 = 8
// Но движок помечается как INVALID независимо от score
```

## Примечания

- **Отрицательные веса** применяются как штрафы
- **Высокие положительные веса** (например, `has_fixed_timestep: 17`) указывают на критическую важность
- **Score не определяет ENGINE_CLASS** - классификация выполняется отдельно (см. `spec/classification_rules.md`)
- **Score используется для ранжирования** вариантов внутри одного класса
- **Версия v2.1.0** рекомендуется для использования, так как учитывает Lift-анализ

---

**См. также**: 
- `spec/classification_rules.md` - правила классификации
- `spec/feature_diff_stable_vs_other.json` - Lift-анализ фич
- `scripts/improve-scoring-v2.mjs` - генератор scoring_v2.json

