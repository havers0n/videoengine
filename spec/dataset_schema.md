# Схема датасета

> Автоматически извлечено из `master/dataset.json` и `master/features.csv`  
> Дата: 2025-12-29

## Формат данных

### 1. `master/dataset.json`

Массив объектов, каждый представляет один вариант движка:

```json
{
  "variant": "string",           // Имя варианта (название папки)
  "feature_events": [             // Массив событий детекции фич
    {
      "variant": "string",
      "feature": "string",        // Имя фичи (например, "has_gradients")
      "file": "string",           // Относительный путь к файлу
      "line": number,            // Номер строки
      "match": "string",          // Текст совпадения
      "snippet": "string",       // Фрагмент кода вокруг совпадения
      "kind": "regex" | "ast"     // Тип детекции
    }
  ]
}
```

### 2. `master/features.json`

Массив объектов с дополнительным полем `run_id`:

```json
{
  "run_id": "string",            // Идентификатор прогона (например, "legacy_01")
  "variant": "string",
  "feature_events": [...]
}
```

### 3. `master/features.csv`

CSV файл с развернутыми boolean-полями и метаданными:

| Колонка | Тип | Описание |
|---------|-----|----------|
| `run_id` | string | Идентификатор прогона |
| `variant` | string | Имя варианта |
| `feature_events` | JSON string | Массив событий (как в JSON) |
| `has_raf` | boolean | Использует requestAnimationFrame |
| `has_cancel_raf` | boolean | Использует cancelAnimationFrame |
| `has_canvas_2d` | boolean | Использует Canvas 2D context |
| `has_resize` | boolean | Обрабатывает resize события |
| `has_stateRef` | boolean | Использует useRef для состояния |
| `setState_in_raf` | boolean | **Анти-паттерн**: setState в RAF |
| `has_dom_overlay_text` | boolean | DOM текст поверх canvas |
| `no_react_state_in_loop` | boolean | Compliance: нет setState в loop |
| `has_tracks_system` | boolean | Система треков/анимации |
| `has_timeline_file` | boolean | Файл Timeline.ts |
| `has_keyframe_system` | boolean | Система keyframes |
| `has_track_sequencing` | boolean | Последовательность треков |
| `has_overlay_component` | boolean | Компонент Overlay.tsx |
| `has_dom_overlay_div` | boolean | div с position absolute/fixed |
| `has_ui_controls` | boolean | Кнопки, слайдеры, UI элементы |
| `has_animation_controls` | boolean | Контролы play/pause/stop |
| `has_component_separation` | boolean | Отдельные компоненты UI и canvas |
| `has_fixed_timestep` | boolean | Фиксированный timestep |
| `uses_performance_now` | boolean | Использует performance.now() |
| `uses_date_now` | boolean | **Анти-паттерн**: использует Date.now() |
| `uses_ts_from_raf` | boolean | Timestamp из RAF callback |
| `has_loop_mod` | boolean | Модуль цикла |
| `has_deterministic_rng` | boolean | Детерминированный RNG (seed-based) |
| `force_spring` | boolean | Пружинные силы |
| `force_attract_to_center` | boolean | Притяжение к центру |
| `force_repulse` | boolean | Отталкивание |
| `force_noise_jitter` | boolean | Шум/дрожание в силах |
| `force_damping_mul` | boolean | Демпфирование (velocity *= damping) |
| `force_velocity_clamp` | boolean | Ограничение скорости |
| `pass_threads` | boolean | Рендер потоков/соединений |
| `pass_particles` | boolean | Рендер частиц |
| `pass_hotspot_gradient` | boolean | Градиенты для hotspots |
| `pass_trails_alpha` | boolean | Альфа-канал для trails |
| `has_lerp` | boolean | Функция линейной интерполяции |
| `has_smoothstep` | boolean | Функция smoothstep |
| `has_easing_words` | boolean | Слова easing (ease-in, ease-out) |
| `has_clusters` | boolean | Кластеры частиц |
| `has_threads` | boolean | Потоки/соединения между частицами |
| `has_hotspots` | boolean | Горячие точки |
| `has_scan_ring` | boolean | Кольцо сканирования |
| `has_stress_pulse` | boolean | Пульсация стресса |
| `has_shadow_blur` | boolean | Тени и размытие |
| `has_trails` | boolean | Следы частиц |
| `has_gradients` | boolean | Градиенты |
| `has_teal` | boolean | Цвет teal/cyan |
| `has_red` | boolean | Красный цвет |
| `uses_math_random` | boolean | **Анти-паттерн**: Math.random() без seed |
| `particle_count` | number \| null | Количество частиц |
| `cluster_count` | number \| null | Количество кластеров |
| `duration_ms` | number \| null | Длительность анимации (мс) |
| `signature` | string | Сигнатура варианта (компактное представление фич) |
| `score` | number | Оценочный балл |
| `ENGINE_CLASS` | string | Класс движка: `STABLE` \| `SEMI` \| `CHAOTIC` \| `NON_COMPLIANT` \| `NON_DETERMINISTIC` \| `INVALID` |
| `files_analyzed` | number | Количество проанализированных файлов |
| `compliance` | JSON string | Массив правил compliance (PASS/FAIL) |
| `compliance_score` | number | Балл compliance (количество PASS) |
| `compliance_total` | number | Всего правил compliance |

## feature_events

Каждое событие содержит:
- **variant**: Имя варианта (дублируется для удобства)
- **feature**: Имя фичи (например, `has_gradients`)
- **file**: Относительный путь к файлу (например, `App.tsx`)
- **line**: Номер строки (1-based)
- **match**: Текст совпадения (для regex) или AST node (для AST)
- **snippet**: Фрагмент кода вокруг совпадения (3 строки до и после)
- **kind**: Тип детекции (`"regex"` или `"ast"`)

## ENGINE_CLASS

Классификация движков (см. `spec/classification_rules.md`):
- **STABLE**: Стабильные движки (текущая реализация: хотя бы одна стабильная фича из: fixed timestep, deterministic RNG, performance.now, stateRef)
  > **⚠️ KNOWN ISSUE**: Описание не соответствует реализации. Реализация допускает STABLE при наличии только fixed timestep, без deterministic RNG. См. `spec/classification_rules.md` раздел "Known Issues".
- **SEMI**: Частично стабильные (используют performance.now или timestamp из RAF)
  > **⚠️ KNOWN ISSUE**: Класс недостижим в текущей реализации из-за логической ошибки.
- **CHAOTIC**: Хаотичные движки без стабильных паттернов
  > **⚠️ KNOWN ISSUE**: Класс недостижим в текущей реализации из-за логической ошибки.
- **NON_COMPLIANT**: Не соответствуют требованиям (нет fixed timestep)
- **NON_DETERMINISTIC**: Не детерминированные (используют Date.now или Math.random без seed)
- **INVALID**: Критически невалидные (setState в RAF)

## signature

Компактное представление фич в виде строки:
- Формат: `C_T_H_TR_GB_-_-_-_-_OK`
- Каждая позиция соответствует определенной категории фич
- `-` означает отсутствие фичи
- Используется для быстрого сравнения вариантов

## compliance

Массив объектов с правилами compliance:

```json
[
  {
    "name": "Fixed Timestep",
    "pass": true,
    "description": "Использует фиксированный timestep для стабильной физики"
  },
  {
    "name": "Deterministic RNG",
    "pass": false,
    "description": "Использует детерминированный RNG (seed-based)"
  }
]
```

---

**Примечание**: Эта схема может расширяться при добавлении новых фич или метаданных.

