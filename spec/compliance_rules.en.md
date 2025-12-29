# Compliance Rules

> Extracted from `scripts/analyze-variants.mjs::generateComplianceTable()` (lines 915-950)  
> Date: 2025-12-29

## Overview

Compliance is a set of rules that determine whether an engine follows best practices for developing animation engines. Each rule is checked independently and returns PASS or FAIL.

## Compliance Rules

### 1. Fixed Timestep

**Name**: `Fixed Timestep`

**Description**: Uses fixed timestep for stable physics

**Check**: `has_fixed_timestep === true`

**Why it matters**: 
- Fixed timestep ensures physics stability regardless of frame rate
- Prevents artifacts when FPS changes
- Foundation for deterministic simulation

**Implementation**: 
- Using "Fix Your Timestep" pattern by Glenn Fiedler
- Constant `FIXED_DT = 1/60` or similar
- Accumulator loop: `while (accumulator >= FIXED_DT) { update(FIXED_DT); accumulator -= FIXED_DT; }`

**Example**:
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

**Name**: `Deterministic RNG`

**Description**: Uses deterministic RNG (seed-based)

**Check**: `has_deterministic_rng === true`

**Why it matters**:
- Ensures simulation reproducibility
- Allows debugging and testing with identical results
- Critical for deterministic simulations

**Implementation**:
- Using seed-based RNG (e.g., `DeterministicRNG`, `SeededRNG`)
- Fixed seed for reproducibility
- Avoiding `Math.random()` in update loop

**Example**:
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

**Name**: `Performance.now`

**Description**: Uses `performance.now()` instead of `Date.now()`

**Check**: `uses_performance_now === true`

**Why it matters**:
- `performance.now()` is monotonic high-precision time
- Independent of system clock (does not change when system time changes)
- Provides microsecond precision
- `Date.now()` can "jump" backward during time synchronization

**Implementation**:
```typescript
// ✅ Correct
const now = performance.now();
const dt = (now - lastTime) / 1000;

// ❌ Incorrect
const now = Date.now();
const dt = (now - lastTime) / 1000;
```

---

### 4. No setState in RAF

**Name**: `No setState in RAF`

**Description**: No setState inside requestAnimationFrame

**Check**: `no_react_state_in_loop === true` AND `setState_in_raf === false`

> **Note**: `no_react_state_in_loop` is computed as `!setState_in_raf`, so the check is effectively duplicated. It's sufficient to check only `setState_in_raf === false`.

**Why it matters**:
- `setState` in RAF triggers React re-render every frame
- This critically reduces performance
- Can lead to lag and frame skipping
- React is not optimized for 60 FPS updates

**Implementation**:
```typescript
// ✅ Correct
const stateRef = useRef({ particles: [] });

function loop() {
  // Update stateRef.current, don't call setState
  update(stateRef.current);
  render();
  requestAnimationFrame(loop);
}

// ❌ Incorrect
const [particles, setParticles] = useState([]);

function loop() {
  // This triggers re-render every frame!
  setParticles(updatedParticles);
  requestAnimationFrame(loop);
}
```

---

### 5. DOM Overlay

**Name**: `DOM Overlay`

**Description**: Has DOM overlay over canvas

**Check**: `has_dom_overlay_div === true` OR `has_overlay_component === true` OR `has_dom_overlay_text === true`

**Why it matters**:
- Allows displaying UI elements over canvas
- Improves UX (buttons, information, controls)
- Separates rendering logic and UI

**Implementation**:
```tsx
// ✅ Correct
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

**Name**: `Tracks System`

**Description**: Has tracks/timeline system

**Check**: `has_tracks_system === true` OR `has_timeline_file === true`

**Why it matters**:
- Allows creating complex animations with keyframes
- Provides temporal control
- Simplifies creating animation sequences

**Implementation**:
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

**Formula**: `compliance_score = number of PASS rules`

**Maximum score**: 6 (all rules PASS)

**Minimum score**: 0 (all rules FAIL)

**Usage**: 
- Ranking variants by quality
- Filtering variants by minimum compliance
- Analyzing prevalence of best practices

## Examples

### Example 1: Full compliance (6/6)

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

### Example 2: Partial compliance (3/6)

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

### Example 3: Low compliance (1/6)

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

## Relationship with ENGINE_CLASS

Compliance rules are related to engine classification:

- **STABLE**: Usually has high compliance_score (4-6)
- **NON_COMPLIANT**: Usually has low compliance_score (0-2), especially absence of Fixed Timestep
- **NON_DETERMINISTIC**: Usually has low compliance_score due to absence of Deterministic RNG or Performance.now
- **INVALID**: May have any compliance_score, but always marked as INVALID due to setState_in_raf

---

**See also**: 
- `spec/classification_rules.md` - engine classification rules
- `spec/scoring_rules.md` - scoring system (includes compliance features)

