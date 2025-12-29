# Feature Catalog

> Extracted from `scripts/analyze-variants.mjs::initFeatureRow()` (lines 138-224)  
> Date: 2025-12-29

## Overview

Complete list of all detectable features in the analysis system. Features are organized by category for easy navigation.

## Feature Categories

### 1. ARCH (Architectural)

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `has_raf` | boolean | Uses `requestAnimationFrame` | AST: call to `requestAnimationFrame` |
| `has_cancel_raf` | boolean | Uses `cancelAnimationFrame` | AST: call to `cancelAnimationFrame` |
| `has_canvas_2d` | boolean | Uses Canvas 2D context | AST: `getContext('2d')` |
| `has_resize` | boolean | Handles resize events | Regex: `addEventListener('resize'` |
| `has_stateRef` | boolean | Uses `useRef` for state | Regex: `useRef` |
| `setState_in_raf` | boolean | **Anti-pattern**: setState in RAF | AST: `setState` or `setX` inside RAF callback |
| `has_dom_overlay_text` | boolean | DOM text over canvas | Regex: `textContent` or `innerText` in overlay |
| `no_react_state_in_loop` | boolean | Compliance: no setState in loop | Computed: `!setState_in_raf` |

### 2. TRACKS & TIMELINE SYSTEM

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `has_tracks_system` | boolean | Tracks/animation system | Regex: `animateTrack` or `tracks.` + keyframes |
| `has_timeline_file` | boolean | Timeline.ts file | File: presence of `Timeline.ts` or `timeline.ts` |
| `has_keyframe_system` | boolean | Keyframe system | Regex: `keyframes` with `at:` or `value:` |
| `has_track_sequencing` | boolean | Track sequencing | Regex: `tracks.push` or `tracks.map` |

### 3. OVERLAY & UI

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `has_overlay_component` | boolean | Overlay.tsx component | File: presence of `Overlay.tsx` |
| `has_dom_overlay_div` | boolean | div with position absolute/fixed | Regex: `<div` + `absolute` or `fixed` |
| `has_ui_controls` | boolean | Buttons, sliders, UI elements | Regex: `button` or `slider` + `onClick` or `onChange` |
| `has_animation_controls` | boolean | play/pause/stop controls | Regex: `play` or `pause` or `stop` |
| `has_component_separation` | boolean | Separate UI and canvas components | Structure: separate files for UI and canvas |

### 4. INTEGRATOR / TIMESTEP

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `has_fixed_timestep` | boolean | Fixed timestep | Regex: `FIXED_DT` or `fixedTimeStep` or `fixed_dt` |
| `uses_performance_now` | boolean | Uses `performance.now()` | AST: call to `performance.now()` |
| `uses_date_now` | boolean | **Anti-pattern**: uses `Date.now()` | AST: call to `Date.now()` |
| `uses_ts_from_raf` | boolean | Timestamp from RAF callback | AST: parameter `time` or `timestamp` in RAF callback |
| `has_loop_mod` | boolean | Loop module | Regex: `loop` or `mod` in time context |
| `has_deterministic_rng` | boolean | Deterministic RNG (seed-based) | Regex: `DeterministicRNG` or `SeededRNG` or `seed` |

### 5. FORCES

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `force_spring` | boolean | Spring forces | Regex: `vx += dx *` or `vy += dy *` |
| `force_attract_to_center` | boolean | Attraction to center | Regex: `attract` or `center` or `gravity` + `vx` or `vy` |
| `force_repulse` | boolean | Repulsion | Regex: `repel` or `repulsion` or `dx = -` + `vx -=` |
| `force_noise_jitter` | boolean | Noise/jitter in forces | Regex: `vx += randomRange` or `vy += Math.random` |
| `force_damping_mul` | boolean | Damping | Regex: `vx *= friction` or `vy *= damping` or `vx *= 0.9` |
| `force_velocity_clamp` | boolean | Velocity clamping | Regex: `clamp(` or `Math.min(` or `Math.max(` + `vx` or `vy` |

### 6. RENDER PASSES

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `pass_threads` | boolean | Render threads/connections | Regex: `lineTo` + connection logic |
| `pass_particles` | boolean | Render particles | Regex: `arc(` or `fillRect(` for particles |
| `pass_hotspot_gradient` | boolean | Gradients for hotspots | Regex: `createRadialGradient` + `fill` |
| `pass_trails_alpha` | boolean | Alpha channel for trails | Regex: `rgba(alpha<1)` + `fillRect` |

### 7. CURVES

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `has_lerp` | boolean | Linear interpolation function | Regex: `lerp(` or `lerp function` |
| `has_smoothstep` | boolean | Smoothstep function | Regex: `smoothstep(` |
| `has_easing_words` | boolean | Easing words | Regex: `ease-in` or `ease-out` or `ease-in-out` |

### 8. SEMANTIC ANCHORS

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `has_clusters` | boolean | Particle clusters | Regex: `clusters` or `cluster` |
| `has_threads` | boolean | Threads/connections between particles | Regex: `lineTo` + connection logic |
| `has_hotspots` | boolean | Hotspots | Regex: `hotspots` or `hotspot` |
| `has_scan_ring` | boolean | Scan ring | Regex: `scan ring` or `scanRing` |
| `has_stress_pulse` | boolean | Stress pulse | Regex: `stress pulse` or `stressPulse` |

### 9. RENDER

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `has_shadow_blur` | boolean | Shadows and blur | Regex: `shadowBlur` |
| `has_trails` | boolean | Particle trails | Regex: `rgba fillStyle` + `fillRect` |
| `has_gradients` | boolean | Gradients | Regex: `createRadialGradient` or `createLinearGradient` |

### 10. COLORS

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `has_teal` | boolean | Teal/cyan color | Regex: `teal` or `cyan` or `#06b6d4` or `hue: 180` |
| `has_red` | boolean | Red color | Regex: `red` or `#ef4444` or `#f00` |

### 11. COMPLIANCE DETECTION

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `uses_math_random` | boolean | **Anti-pattern**: `Math.random()` without seed | AST: call to `Math.random()` |

### 12. CONSTANTS

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `particle_count` | number \| null | Particle count | AST: constant `PARTICLE_COUNT` or `particleCount` |
| `cluster_count` | number \| null | Cluster count | AST: constant `CLUSTER_COUNT` or `clusterCount` |
| `duration_ms` | number \| null | Animation duration (ms) | AST: constant `DURATION_MS` or `duration` |

### 13. COMPUTED

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `signature` | string | Variant signature | Computed: compact feature representation |
| `score` | number | Score | Computed: see `spec/scoring_rules.md` |
| `ENGINE_CLASS` | string | Engine class | Computed: see `spec/classification_rules.md` |
| `files_analyzed` | number | Number of analyzed files | Computed: number of processed files |

## Detection Methods

### AST (Abstract Syntax Tree)

Uses `ts-morph` library for TypeScript/TSX code analysis:
- Function call search
- Variable usage search
- Code structure analysis

**Examples**:
- `uses_performance_now`: search for `performance.now()` call
- `uses_date_now`: search for `Date.now()` call
- `setState_in_raf`: search for `setState` inside RAF callback

### Regex (Regular Expressions)

Used for pattern search in code text:
- Keyword search
- Naming pattern search
- Comment search

**Examples**:
- `has_fixed_timestep`: search for `FIXED_DT` or `fixedTimeStep`
- `has_clusters`: search for word `clusters`
- `has_teal`: search for `teal` or `cyan` in code

### File-based

File structure analysis:
- Presence of specific files
- File names
- Directory structure

**Examples**:
- `has_timeline_file`: presence of `Timeline.ts`
- `has_overlay_component`: presence of `Overlay.tsx`

## feature_events

Each detected feature creates an event in the `feature_events` array:

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

## Extending the Catalog

To add a new feature:

1. Add field to `initFeatureRow()` (lines 138-224)
2. Add detection logic to `analyzeSourceFile()` (lines 247-842)
3. Add weight to `scoring.json` or `scoring_v2.json` (if applicable)
4. Update documentation in `spec/feature_catalog.md`

---

**See also**: 
- `spec/classification_rules.md` - using features for classification
- `spec/scoring_rules.md` - feature weights for scoring
- `scripts/analyze-variants.mjs` - detection source code

