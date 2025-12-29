# Engine Classification Rules

> Extracted from `scripts/analyze-variants.mjs::classifyEngineClass()` (lines 876-910)  
> Date: 2025-12-29

## Overview

The `classifyEngineClass(row)` function classifies engines based on their characteristics into the following classes:

1. **INVALID** - Critically invalid
2. **NON_DETERMINISTIC** - Non-deterministic
3. **NON_COMPLIANT** - Do not meet requirements
4. **STABLE** - Stable
5. **SEMI** - Partially stable
6. **CHAOTIC** - Chaotic

> **⚠️ KNOWN BUG**: In the current implementation (lines 876-910), classes **SEMI** and **CHAOTIC** are effectively unreachable due to a logical error. See "Known Issues" section below.

## Classification Rules (by priority)

### 1. INVALID (Critical violation)

**Condition**: `setState_in_raf === true`

**Description**: Engine calls React state setters (setState, useState setters) inside requestAnimationFrame or animation loop. This is a critical performance violation as it triggers React re-renders every frame.

**Action**: Engine is marked as INVALID regardless of other characteristics.

---

### 2. NON_DETERMINISTIC (Non-deterministic)

**Condition**: 
- `uses_date_now === true` OR
- (`uses_math_random === true` AND `has_deterministic_rng === false`)

**Description**: Engine uses non-deterministic sources of time or randomness:
- `Date.now()` - not monotonic, depends on system time
- `Math.random()` without deterministic RNG - unpredictable randomness

**Consequences**: Simulation is not reproducible, results depend on execution time.

---

### 3. NON_COMPLIANT (Do not meet requirements)

**Condition**: `has_fixed_timestep === false`

**Description**: Engine does not use fixed timestep. This is a critical requirement for stable physics (see "Fix Your Timestep" by Glenn Fiedler).

**Consequences**: Physics depends on frame rate, artifacts may occur when FPS changes.

---

### 4. STABLE (Stable)

**Condition (current implementation)**: 
- Has at least one stability feature:
  - `uses_performance_now === true` OR
  - `has_fixed_timestep === true` OR
  - `has_deterministic_rng === true` OR
  - `has_stateRef === true`
- AND `setState_in_raf === false` (not INVALID)

> **⚠️ BUG**: If we reached this step, then `has_fixed_timestep === true` (otherwise we would have exited at step 3 as NON_COMPLIANT). And `has_fixed_timestep` is included in the OR condition, so STABLE always triggers, making SEMI and CHAOTIC unreachable.

**Description**: Engine uses stable patterns:
- `performance.now()` - monotonic high-precision time
- Fixed timestep - stable physics
- Deterministic RNG - reproducible randomness
- `useRef` for state - avoids React re-renders

**Characteristics**: Reproducible, stable, performant.

**Note**: The dataset description states "stable engines with fixed timestep and deterministic RNG", but the current implementation allows STABLE even without deterministic RNG (fixed timestep is sufficient). This is a semantic inconsistency.

---

### 5. SEMI (Partially stable)

**Condition**: 
- `uses_performance_now === true` OR
- `uses_ts_from_raf === true`
- AND does not fall into previous categories

> **⚠️ UNREACHABLE**: This class is unreachable in the current implementation, because if `has_fixed_timestep === true`, then STABLE will trigger earlier. And if `has_fixed_timestep === false`, we exit as NON_COMPLIANT at step 3.

**Description**: Engine uses correct time sources, but may lack other stable patterns (e.g., no fixed timestep or deterministic RNG).

**Characteristics**: Partially stable, but not fully optimized.

---

### 6. CHAOTIC (Chaotic)

**Condition**: Everything else (does not fall into previous categories)

> **⚠️ UNREACHABLE**: This class is unreachable in the current implementation for the same reason as SEMI.

**Description**: Engine does not use stable patterns, may have performance and reproducibility issues.

**Characteristics**: Unstable, unpredictable, may have performance issues.

---

## Decision Tree

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

## Examples

### Example 1: STABLE
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

### Example 2: NON_DETERMINISTIC
```javascript
{
  uses_date_now: true,
  has_fixed_timestep: false,
  setState_in_raf: false
}
// → ENGINE_CLASS: "NON_DETERMINISTIC"
```

### Example 3: NON_COMPLIANT
```javascript
{
  has_fixed_timestep: false,
  uses_performance_now: true,
  setState_in_raf: false
}
// → ENGINE_CLASS: "NON_COMPLIANT"
```

### Example 4: INVALID
```javascript
{
  setState_in_raf: true,
  has_fixed_timestep: true,
  uses_performance_now: true
}
// → ENGINE_CLASS: "INVALID" (priority over others)
```

---

## Notes

- Classification is performed in priority order (top to bottom)
- First match determines the class
- INVALID has the highest priority
- STABLE requires a combination of stable patterns
- Classification can be extended with new rules

---

## Known Issues

### 1. SEMI and CHAOTIC are unreachable

**Problem**: In the current implementation of `classifyEngineClass()` (lines 876-910), classes SEMI and CHAOTIC are effectively unreachable.

**Cause**: 
- Step 3: if `has_fixed_timestep === false`, return `NON_COMPLIANT`
- Step 4: check `hasStabilityFeature` (includes `has_fixed_timestep` in OR)
- If we reached step 4, then `has_fixed_timestep === true`
- Therefore `hasStabilityFeature` is always true, and STABLE always triggers
- SEMI and CHAOTIC are never reached

**Consequences**:
- Lift analysis on "STABLE" vs "OTHER" is incorrect (STABLE effectively = "has fixed timestep")
- scoring_v2.json is based on incorrect Lift
- prompt constraints are generated from incorrect data

**Recommendation for new repository**:
- Review classification logic
- Separate static heuristic (STATIC_COMPLIANT) and runtime determinism (RUNTIME_DETERMINISTIC)
- Recalculate Lift after fixing classification

### 2. Semantic inconsistency of STABLE

**Problem**: In `spec/dataset_schema.md`, STABLE is described as "stable engines with fixed timestep and deterministic RNG", but the rules allow STABLE even without deterministic RNG (fixed timestep is sufficient).

**Recommendation**: Choose one definition and make it consistent across all specs.

---

**See also**: `spec/compliance_rules.md` for detailed compliance rules

