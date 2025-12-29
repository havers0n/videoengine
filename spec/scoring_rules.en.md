# Engine Scoring Rules

> Extracted from `master/scoring.json` (v2.0.0) and `master/scoring_v2.json` (v2.1.0)  
> Date: 2025-12-29

## Overview

The scoring system evaluates engine quality based on the presence/absence of certain features. Each feature has a weight that is added to or subtracted from the final score.

## Versions

### v2.0.0 (scoring.json)

**Formula**: `score = Σ(feature_present * weight)`

Simple sum of weights for present features.

### v2.1.0 (scoring_v2.json)

**Formula**: `score = Σ(feature_present * log(lift + 1) * confidence_weight * manual_weight)`

Improved formula considering:
- **Lift**: Feature correlation with STABLE class (from `feature_diff_stable_vs_other.json`)
- **Confidence weight**: Confidence coefficient for controversial features
- **Manual weight**: Manual weight adjustment (from scoring.json)

**Advantages**:
- Logarithmic scaling prevents extreme values (e.g., lift=999) from dominating
- Lift consideration makes scoring more objective
- Confidence weights reduce impact of controversial features

## Feature Weights (v2.1.0)

### Architectural Features

| Feature | Weight | Description |
|---------|--------|-------------|
| `has_canvas_2d` | 1 | Uses Canvas 2D context |
| `has_raf` | 1 | Uses requestAnimationFrame |
| `setState_in_raf` | **-20** | **Anti-pattern**: setState in RAF |
| `has_stateRef` | 3 | Uses useRef for state |
| `no_react_state_in_loop` | 5 | Compliance: no setState in loop |
| `has_cancel_raf` | 1 | Uses cancelAnimationFrame |
| `has_resize` | 1 | Handles resize events |

### Timestep and Determinism

| Feature | Weight | Description |
|---------|--------|-------------|
| `has_fixed_timestep` | **17** | Fixed timestep (critical) |
| `has_deterministic_rng` | 9 | Deterministic RNG (seed-based) |
| `uses_performance_now` | 8 | Uses performance.now() |
| `uses_date_now` | **-7** | **Anti-pattern**: uses Date.now() |
| `uses_ts_from_raf` | -1 | Timestamp from RAF callback |

### Forces and Physics

| Feature | Weight | Description |
|---------|--------|-------------|
| `force_spring` | 2 | Spring forces |
| `force_damping_mul` | 2 | Damping |
| `force_noise_jitter` | 1 | Noise/jitter (confidence: 0.5) |
| `force_attract_to_center` | 0.86 | Attraction to center |
| `force_repulse` | 0.91 | Repulsion |

### Visual Effects

| Feature | Weight | Description |
|---------|--------|-------------|
| `has_threads` | 2 | Threads/connections |
| `has_clusters` | 2 | Particle clusters |
| `has_trails` | 2 | Particle trails |
| `has_shadow_blur` | 2 | Shadows and blur |
| `has_gradients` | 1 | Gradients |
| `has_hotspots` | 1 | Hotspots |
| `has_scan_ring` | 1 | Scan ring (confidence: 0.7) |
| `has_teal` | -1 | Teal/cyan color |
| `has_red` | 2 | Red color |

### Tracks and Timeline

| Feature | Weight | Description |
|---------|--------|-------------|
| `has_tracks_system` | 8 | Tracks/animation system |
| `has_timeline_file` | 6 | Timeline.ts file |
| `has_keyframe_system` | 5 | Keyframe system |
| `has_track_sequencing` | 4 | Track sequencing |

### UI and Overlay

| Feature | Weight | Description |
|---------|--------|-------------|
| `has_overlay_component` | 8 | Overlay.tsx component |
| `has_dom_overlay_div` | 4 | div with position absolute/fixed |
| `has_ui_controls` | 3 | Buttons, sliders, UI elements |
| `has_animation_controls` | 4 | play/pause/stop controls |
| `has_component_separation` | 3 | Separate UI and canvas components |

## Confidence Weights (v2.1.0)

Some features have reduced confidence coefficients:

| Feature | Confidence | Reason |
|---------|-----------|--------|
| `force_noise_jitter` | 0.5 | Controversial feature - may be unseeded |
| `has_scan_ring` | 0.7 | Medium confidence |
| Others | 1.0 | Full confidence |

## Rationale

### Too Common Features

These features appear in almost all variants, so they have low weight:
- `has_raf`
- `has_cancel_raf`
- `has_canvas_2d`
- `has_resize`
- `pass_particles`
- `has_teal`
- `has_red`

### Rare Features

These features are rare but important for quality:
- `setState_in_raf` (anti-pattern)
- `has_dom_overlay_text`
- `has_fixed_timestep`
- `uses_date_now` (anti-pattern)
- `force_spring`
- `force_noise_jitter`
- `force_damping_mul`
- `has_smoothstep`
- `has_clusters`
- `has_scan_ring`

### Stability Features

Critically important for stability:
- `has_fixed_timestep`
- `has_deterministic_rng`
- `has_stateRef`
- `uses_performance_now`

### Anti-Patterns

Patterns that should be prohibited:
- `setState_in_raf` (weight: -20)
- `uses_date_now` (weight: -7)
- `no_deterministic_rng` (absence of deterministic RNG when using randomness)

## Calculation Examples

### Example 1: STABLE engine

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
  setState_in_raf: false,          // 0 (no penalty)
  uses_date_now: false             // 0 (no penalty)
}
// Final score: 44
```

### Example 2: NON_DETERMINISTIC engine

```javascript
{
  has_fixed_timestep: false,       // 0
  uses_date_now: true,             // -7
  uses_math_random: true,          // 0 (not directly counted)
  has_deterministic_rng: false,    // 0
  has_canvas_2d: true,             // +1
  has_raf: true,                   // +1
  setState_in_raf: false           // 0
}
// Final score: -5
```

### Example 3: INVALID engine

```javascript
{
  setState_in_raf: true,            // -20
  has_fixed_timestep: true,        // +17
  has_deterministic_rng: true,     // +9
  has_canvas_2d: true,             // +1
  has_raf: true                    // +1
}
// Final score: -20 + 17 + 9 + 1 + 1 = 8
// But engine is marked as INVALID regardless of score
```

## Notes

- **Negative weights** are applied as penalties
- **High positive weights** (e.g., `has_fixed_timestep: 17`) indicate critical importance
- **Score does not determine ENGINE_CLASS** - classification is performed separately (see `spec/classification_rules.md`)
- **Score is used for ranking** variants within the same class
- **Version v2.1.0** is recommended for use as it considers Lift analysis

---

**See also**: 
- `spec/classification_rules.md` - classification rules
- `spec/feature_diff_stable_vs_other.json` - Lift analysis of features
- `scripts/improve-scoring-v2.mjs` - scoring_v2.json generator

