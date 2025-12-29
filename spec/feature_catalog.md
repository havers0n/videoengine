# Каталог фич

> Извлечено из `scripts/analyze-variants.mjs::initFeatureRow()` (строки 138-224)  
> Дата: 2025-12-29

## Обзор

Полный список всех детектируемых фич в системе анализа. Фичи организованы по категориям для удобства навигации.

## Категории фич

### 1. ARCH (Архитектурные)

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `has_raf` | boolean | Использует `requestAnimationFrame` | AST: вызов `requestAnimationFrame` |
| `has_cancel_raf` | boolean | Использует `cancelAnimationFrame` | AST: вызов `cancelAnimationFrame` |
| `has_canvas_2d` | boolean | Использует Canvas 2D context | AST: `getContext('2d')` |
| `has_resize` | boolean | Обрабатывает resize события | Regex: `addEventListener('resize'` |
| `has_stateRef` | boolean | Использует `useRef` для состояния | Regex: `useRef` |
| `setState_in_raf` | boolean | **Анти-паттерн**: setState в RAF | AST: `setState` или `setX` внутри RAF callback |
| `has_dom_overlay_text` | boolean | DOM текст поверх canvas | Regex: `textContent` или `innerText` в overlay |
| `no_react_state_in_loop` | boolean | Compliance: нет setState в loop | Вычисляется: `!setState_in_raf` |

### 2. TRACKS & TIMELINE SYSTEM

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `has_tracks_system` | boolean | Система треков/анимации | Regex: `animateTrack` или `tracks.` + keyframes |
| `has_timeline_file` | boolean | Файл Timeline.ts | Файл: наличие `Timeline.ts` или `timeline.ts` |
| `has_keyframe_system` | boolean | Система keyframes | Regex: `keyframes` с `at:` или `value:` |
| `has_track_sequencing` | boolean | Последовательность треков | Regex: `tracks.push` или `tracks.map` |

### 3. OVERLAY & UI

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `has_overlay_component` | boolean | Компонент Overlay.tsx | Файл: наличие `Overlay.tsx` |
| `has_dom_overlay_div` | boolean | div с position absolute/fixed | Regex: `<div` + `absolute` или `fixed` |
| `has_ui_controls` | boolean | Кнопки, слайдеры, UI элементы | Regex: `button` или `slider` + `onClick` или `onChange` |
| `has_animation_controls` | boolean | Контролы play/pause/stop | Regex: `play` или `pause` или `stop` |
| `has_component_separation` | boolean | Отдельные компоненты UI и canvas | Структура: отдельные файлы для UI и canvas |

### 4. INTEGRATOR / TIMESTEP

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `has_fixed_timestep` | boolean | Фиксированный timestep | Regex: `FIXED_DT` или `fixedTimeStep` или `fixed_dt` |
| `uses_performance_now` | boolean | Использует `performance.now()` | AST: вызов `performance.now()` |
| `uses_date_now` | boolean | **Анти-паттерн**: использует `Date.now()` | AST: вызов `Date.now()` |
| `uses_ts_from_raf` | boolean | Timestamp из RAF callback | AST: параметр `time` или `timestamp` в RAF callback |
| `has_loop_mod` | boolean | Модуль цикла | Regex: `loop` или `mod` в контексте времени |
| `has_deterministic_rng` | boolean | Детерминированный RNG (seed-based) | Regex: `DeterministicRNG` или `SeededRNG` или `seed` |

### 5. FORCES (Силы)

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `force_spring` | boolean | Пружинные силы | Regex: `vx += dx *` или `vy += dy *` |
| `force_attract_to_center` | boolean | Притяжение к центру | Regex: `attract` или `center` или `gravity` + `vx` или `vy` |
| `force_repulse` | boolean | Отталкивание | Regex: `repel` или `repulsion` или `dx = -` + `vx -=` |
| `force_noise_jitter` | boolean | Шум/дрожание в силах | Regex: `vx += randomRange` или `vy += Math.random` |
| `force_damping_mul` | boolean | Демпфирование | Regex: `vx *= friction` или `vy *= damping` или `vx *= 0.9` |
| `force_velocity_clamp` | boolean | Ограничение скорости | Regex: `clamp(` или `Math.min(` или `Math.max(` + `vx` или `vy` |

### 6. RENDER PASSES

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `pass_threads` | boolean | Рендер потоков/соединений | Regex: `lineTo` + логика соединений |
| `pass_particles` | boolean | Рендер частиц | Regex: `arc(` или `fillRect(` для частиц |
| `pass_hotspot_gradient` | boolean | Градиенты для hotspots | Regex: `createRadialGradient` + `fill` |
| `pass_trails_alpha` | boolean | Альфа-канал для trails | Regex: `rgba(alpha<1)` + `fillRect` |

### 7. CURVES (Кривые)

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `has_lerp` | boolean | Функция линейной интерполяции | Regex: `lerp(` или `lerp function` |
| `has_smoothstep` | boolean | Функция smoothstep | Regex: `smoothstep(` |
| `has_easing_words` | boolean | Слова easing | Regex: `ease-in` или `ease-out` или `ease-in-out` |

### 8. SEMANTIC ANCHORS (Семантические якоря)

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `has_clusters` | boolean | Кластеры частиц | Regex: `clusters` или `cluster` |
| `has_threads` | boolean | Потоки/соединения между частицами | Regex: `lineTo` + логика соединений |
| `has_hotspots` | boolean | Горячие точки | Regex: `hotspots` или `hotspot` |
| `has_scan_ring` | boolean | Кольцо сканирования | Regex: `scan ring` или `scanRing` |
| `has_stress_pulse` | boolean | Пульсация стресса | Regex: `stress pulse` или `stressPulse` |

### 9. RENDER (Рендеринг)

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `has_shadow_blur` | boolean | Тени и размытие | Regex: `shadowBlur` |
| `has_trails` | boolean | Следы частиц | Regex: `rgba fillStyle` + `fillRect` |
| `has_gradients` | boolean | Градиенты | Regex: `createRadialGradient` или `createLinearGradient` |

### 10. COLORS (Цвета)

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `has_teal` | boolean | Цвет teal/cyan | Regex: `teal` или `cyan` или `#06b6d4` или `hue: 180` |
| `has_red` | boolean | Красный цвет | Regex: `red` или `#ef4444` или `#f00` |

### 11. COMPLIANCE DETECTION

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `uses_math_random` | boolean | **Анти-паттерн**: `Math.random()` без seed | AST: вызов `Math.random()` |

### 12. CONSTANTS (Константы)

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `particle_count` | number \| null | Количество частиц | AST: константа `PARTICLE_COUNT` или `particleCount` |
| `cluster_count` | number \| null | Количество кластеров | AST: константа `CLUSTER_COUNT` или `clusterCount` |
| `duration_ms` | number \| null | Длительность анимации (мс) | AST: константа `DURATION_MS` или `duration` |

### 13. COMPUTED (Вычисляемые)

| Фича | Тип | Описание | Детекция |
|------|-----|----------|----------|
| `signature` | string | Сигнатура варианта | Вычисляется: компактное представление фич |
| `score` | number | Оценочный балл | Вычисляется: см. `spec/scoring_rules.md` |
| `ENGINE_CLASS` | string | Класс движка | Вычисляется: см. `spec/classification_rules.md` |
| `files_analyzed` | number | Количество проанализированных файлов | Вычисляется: количество обработанных файлов |

## Методы детекции

### AST (Abstract Syntax Tree)

Используется библиотека `ts-morph` для анализа TypeScript/TSX кода:
- Поиск вызовов функций
- Поиск использования переменных
- Анализ структуры кода

**Примеры**:
- `uses_performance_now`: поиск вызова `performance.now()`
- `uses_date_now`: поиск вызова `Date.now()`
- `setState_in_raf`: поиск `setState` внутри RAF callback

### Regex (Регулярные выражения)

Используется для поиска паттернов в тексте кода:
- Поиск ключевых слов
- Поиск паттернов именования
- Поиск комментариев

**Примеры**:
- `has_fixed_timestep`: поиск `FIXED_DT` или `fixedTimeStep`
- `has_clusters`: поиск слова `clusters`
- `has_teal`: поиск `teal` или `cyan` в коде

### File-based (На основе файлов)

Анализ структуры файлов:
- Наличие определенных файлов
- Имена файлов
- Структура директорий

**Примеры**:
- `has_timeline_file`: наличие `Timeline.ts`
- `has_overlay_component`: наличие `Overlay.tsx`

## feature_events

Каждая детектированная фича создает событие в массиве `feature_events`:

```json
{
  "variant": "variant-name",
  "feature": "has_gradients",
  "file": "App.tsx",
  "line": 198,
  "match": "gradient creation",
  "snippet": "...",
  "kind": "regex"
}
```

## Расширение каталога

Для добавления новой фичи:

1. Добавить поле в `initFeatureRow()` (строки 138-224)
2. Добавить логику детекции в `analyzeSourceFile()` (строки 247-842)
3. Добавить вес в `scoring.json` или `scoring_v2.json` (если применимо)
4. Обновить документацию в `spec/feature_catalog.md`

---

**См. также**: 
- `spec/classification_rules.md` - использование фич для классификации
- `spec/scoring_rules.md` - веса фич для скоринга
- `scripts/analyze-variants.mjs` - исходный код детекции

