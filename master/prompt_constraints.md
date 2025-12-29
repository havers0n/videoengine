# System Prompt Constraints для Gemini

> Автоматически сгенерировано из master/feature_diff_stable_vs_other.json
> Дата: 2025-12-29T17:13:52.840Z
> Всего вариантов: 71 (STABLE: 7, OTHER: 64)

## Hard Constraints (ОБЯЗАТЕЛЬНО)

Эти требования должны быть включены в системный промпт как обязательные:

1. You MUST use a fixed timestep approach with an accumulator loop pattern (Fix Your Timestep by Glenn Fiedler). Use a fixed delta time (e.g., FIXED_DT = 1/60) and accumulate frame time until it's processed.

## Soft Hints (РЕКОМЕНДУЕТСЯ)

Эти рекомендации можно включить в системный промпт для улучшения качества:

- It is recommended to implement an accumulator loop pattern: while (accumulator >= FIXED_DT) { update(FIXED_DT); accumulator -= FIXED_DT; }

- If using noise/jitter for force calculations, ensure it uses a deterministic seeded RNG, not Math.random(). This prevents particle gridlocking (sleeping bodies issue).

- It is recommended to organize entities into clusters or spatial structures for performance and visual appeal.

- Apply damping (velocity *= damping_factor) to prevent infinite acceleration and create more stable simulations.

- It is recommended to use useRef for mutable state that changes in the animation loop, instead of useState.

- Spring forces can add natural, organic motion to particles.

## Negative Constraints (ЗАПРЕЩЕНО)

Эти паттерны должны быть явно запрещены:

1. Do NOT call React state setters (setState, useState setters) inside requestAnimationFrame or animation loops. Use useRef for frame-by-frame mutable state.

2. Do NOT use Date.now() for timing. Use performance.now() instead.

3. Do NOT use Math.random() without a deterministic seed. Use a seeded RNG if randomness is needed.

---

## Статистика по Lift

### Топ-10 признаков для STABLE (высокий Lift):
- `has_fixed_timestep`: Lift=999, p_stable=1, coverage=9.9%
- `has_accumulator_loop`: Lift=64, p_stable=1, coverage=11.3%
- `force_noise_jitter`: Lift=4.57, p_stable=0.143, coverage=4.2%
- `has_clusters`: Lift=3.92, p_stable=0.857, coverage=28.2%
- `force_damping_mul`: Lift=3.92, p_stable=0.429, coverage=14.1%
- `has_scan_ring`: Lift=3.05, p_stable=0.571, coverage=22.5%
- `has_stateRef`: Lift=2.74, p_stable=0.857, coverage=36.6%
- `force_spring`: Lift=2.61, p_stable=0.286, coverage=12.7%
- `uses_performance_now`: Lift=2.19, p_stable=0.857, coverage=43.7%
- `has_deterministic_rng`: Lift=2, p_stable=1, coverage=54.9%

### Топ-10 признаков, НЕ характерных для STABLE (низкий Lift):
- `has_canvas_2d`: Lift=1.03, p_stable=1, coverage=97.2%
- `no_react_state_in_loop`: Lift=1.03, p_stable=1, coverage=97.2%
- `has_raf`: Lift=1.02, p_stable=1, coverage=98.6%
- `has_cancel_raf`: Lift=1.02, p_stable=1, coverage=98.6%
- `has_red`: Lift=1.02, p_stable=0.857, coverage=84.5%
- `pass_threads`: Lift=0.99, p_stable=0.714, coverage=71.8%
- `has_threads`: Lift=0.95, p_stable=0.714, coverage=74.6%
- `force_repulse`: Lift=0.91, p_stable=0.286, coverage=31%
- `force_attract_to_center`: Lift=0.86, p_stable=0.429, coverage=49.3%
- `has_resize`: Lift=0.85, p_stable=0.714, coverage=83.1%

---

## Использование

Скопируйте разделы "Hard Constraints" и "Negative Constraints" в системный промпт для Gemini.
Раздел "Soft Hints" можно использовать как рекомендации или включить выборочно.
