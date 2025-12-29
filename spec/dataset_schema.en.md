# Dataset Schema

> Automatically extracted from `master/dataset.json` and `master/features.csv`  
> Date: 2025-12-29

## Data Format

### 1. `master/dataset.json`

Array of objects, each representing one engine variant:

```json
{
  "variant": "string",           // Variant name (folder name)
  "feature_events": [             // Array of feature detection events
    {
      "variant": "string",
      "feature": "string",        // Feature name (e.g., "has_gradients")
      "file": "string",           // Relative file path
      "line": number,            // Line number
      "match": "string",          // Match text
      "snippet": "string",       // Code snippet around the match
      "kind": "regex" | "ast"     // Detection type
    }
  ]
}
```

### 2. `master/features.json`

Array of objects with additional `run_id` field:

```json
{
  "run_id": "string",            // Run identifier (e.g., "legacy_01")
  "variant": "string",
  "feature_events": [...]
}
```

### 3. `master/features.csv`

CSV file with expanded boolean fields and metadata:

| Column | Type | Description |
|--------|------|-------------|
| `run_id` | string | Run identifier |
| `variant` | string | Variant name |
| `feature_events` | JSON string | Array of events (same as JSON) |
| `has_raf` | boolean | Uses requestAnimationFrame |
| `has_cancel_raf` | boolean | Uses cancelAnimationFrame |
| `has_canvas_2d` | boolean | Uses Canvas 2D context |
| `has_resize` | boolean | Handles resize events |
| `has_stateRef` | boolean | Uses useRef for state |
| `setState_in_raf` | boolean | **Anti-pattern**: setState in RAF |
| `has_dom_overlay_text` | boolean | DOM text over canvas |
| `no_react_state_in_loop` | boolean | Compliance: no setState in loop |
| `has_tracks_system` | boolean | Tracks/animation system |
| `has_timeline_file` | boolean | Timeline.ts file |
| `has_keyframe_system` | boolean | Keyframe system |
| `has_track_sequencing` | boolean | Track sequencing |
| `has_overlay_component` | boolean | Overlay.tsx component |
| `has_dom_overlay_div` | boolean | div with position absolute/fixed |
| `has_ui_controls` | boolean | Buttons, sliders, UI elements |
| `has_animation_controls` | boolean | play/pause/stop controls |
| `has_component_separation` | boolean | Separate UI and canvas components |
| `has_fixed_timestep` | boolean | Fixed timestep |
| `uses_performance_now` | boolean | Uses performance.now() |
| `uses_date_now` | boolean | **Anti-pattern**: uses Date.now() |
| `uses_ts_from_raf` | boolean | Timestamp from RAF callback |
| `has_loop_mod` | boolean | Loop module |
| `has_deterministic_rng` | boolean | Deterministic RNG (seed-based) |
| `force_spring` | boolean | Spring forces |
| `force_attract_to_center` | boolean | Attraction to center |
| `force_repulse` | boolean | Repulsion |
| `force_noise_jitter` | boolean | Noise/jitter in forces |
| `force_damping_mul` | boolean | Damping (velocity *= damping) |
| `force_velocity_clamp` | boolean | Velocity clamping |
| `pass_threads` | boolean | Render threads/connections |
| `pass_particles` | boolean | Render particles |
| `pass_hotspot_gradient` | boolean | Gradients for hotspots |
| `pass_trails_alpha` | boolean | Alpha channel for trails |
| `has_lerp` | boolean | Linear interpolation function |
| `has_smoothstep` | boolean | Smoothstep function |
| `has_easing_words` | boolean | Easing words (ease-in, ease-out) |
| `has_clusters` | boolean | Particle clusters |
| `has_threads` | boolean | Threads/connections between particles |
| `has_hotspots` | boolean | Hotspots |
| `has_scan_ring` | boolean | Scan ring |
| `has_stress_pulse` | boolean | Stress pulse |
| `has_shadow_blur` | boolean | Shadows and blur |
| `has_trails` | boolean | Particle trails |
| `has_gradients` | boolean | Gradients |
| `has_teal` | boolean | Teal/cyan color |
| `has_red` | boolean | Red color |
| `uses_math_random` | boolean | **Anti-pattern**: Math.random() without seed |
| `particle_count` | number \| null | Particle count |
| `cluster_count` | number \| null | Cluster count |
| `duration_ms` | number \| null | Animation duration (ms) |
| `signature` | string | Variant signature (compact feature representation) |
| `score` | number | Score |
| `ENGINE_CLASS` | string | Engine class: `STABLE` \| `SEMI` \| `CHAOTIC` \| `NON_COMPLIANT` \| `NON_DETERMINISTIC` \| `INVALID` |
| `files_analyzed` | number | Number of analyzed files |
| `compliance` | JSON string | Array of compliance rules (PASS/FAIL) |
| `compliance_score` | number | Compliance score (number of PASS) |
| `compliance_total` | number | Total compliance rules |

## feature_events

Each event contains:
- **variant**: Variant name (duplicated for convenience)
- **feature**: Feature name (e.g., `has_gradients`)
- **file**: Relative file path (e.g., `App.tsx`)
- **line**: Line number (1-based)
- **match**: Match text (for regex) or AST node (for AST)
- **snippet**: Code snippet around the match (3 lines before and after)
- **kind**: Detection type (`"regex"` or `"ast"`)

## ENGINE_CLASS

Engine classification (see `spec/classification_rules.md`):
- **STABLE**: Stable engines (current implementation: at least one stability feature from: fixed timestep, deterministic RNG, performance.now, stateRef)
  > **⚠️ KNOWN ISSUE**: Description does not match implementation. Implementation allows STABLE with only fixed timestep, without deterministic RNG. See `spec/classification_rules.md` "Known Issues" section.
- **SEMI**: Partially stable (use performance.now or timestamp from RAF)
  > **⚠️ KNOWN ISSUE**: Class is unreachable in current implementation due to logical error.
- **CHAOTIC**: Chaotic engines without stable patterns
  > **⚠️ KNOWN ISSUE**: Class is unreachable in current implementation due to logical error.
- **NON_COMPLIANT**: Do not meet requirements (no fixed timestep)
- **NON_DETERMINISTIC**: Non-deterministic (use Date.now or Math.random without seed)
- **INVALID**: Critically invalid (setState in RAF)

## signature

Compact feature representation as a string:
- Format: `C_T_H_TR_GB_-_-_-_-_OK`
- Each position corresponds to a specific feature category
- `-` means feature is absent
- Used for quick variant comparison

## compliance

Array of objects with compliance rules:

```json
[
  {
    "name": "Fixed Timestep",
    "pass": true,
    "description": "Uses fixed timestep for stable physics"
  },
  {
    "name": "Deterministic RNG",
    "pass": false,
    "description": "Uses deterministic RNG (seed-based)"
  }
]
```

---

**Note**: This schema may be extended when adding new features or metadata.

