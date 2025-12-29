# VideoEngine R&D — Frozen Research Snapshot

> ⚠️ **ARCHIVED / FROZEN REPOSITORY**  
> This repository is intentionally frozen and will not receive further updates.  
> It represents a completed research phase focused on analyzing and classifying AI-generated animation engines.  
> **Successor project**: [videoengine-lab](https://github.com/havers0n/videoengine-lab) (next-generation experimental pipeline)

---

## What This Repository Is

This project is a research sandbox for studying how LLMs (Gemini in particular) generate animation engines and what structural patterns lead to stable, deterministic, and high-quality results.

**It is not:**
- A production-ready animation framework
- A reusable library
- A runtime engine

**It is:**
- A controlled dataset of generated engines
- A feature-extraction and scoring system
- A forensic analysis of "what makes an animation engine stable"

> Think of it as a lab notebook + dataset, not a product.

---

## What Was Studied

Each generated "engine" was analyzed for:

- **Determinism** (seeded RNG, fixed timestep)
- **Runtime stability** (no React state in render loops)
- **Structural patterns** (clusters, hotspots, trails, timelines)
- **Rendering approach** (Canvas, DOM overlay, etc.)
- **Engine hygiene** (cleanup, RAF lifecycle, time handling)

The goal was to reverse-engineer what differentiates stable engines from chaotic ones.

---

## Key Outcome

**Out of 71 generated variants, only 7 qualified as truly STABLE.**

The analysis revealed a very strong signal:

> **Stability is not about visuals — it is about simulation architecture.**

This repository contains the data and tooling that led to that conclusion.

---

## Repository Structure

```
/runs/            # All generation runs (immutable history)
/master/          # Aggregated datasets and computed features
/data/            # Legacy raw inputs (deprecated)
/scripts/         # Analysis, migration, and tooling scripts
/spec/            # Formal specs (features, scoring, rules)
/snapshots/       # Frozen dataset snapshots
```

---

## Key Concepts

### Runs

Each run represents one controlled batch of generated engines.

```
runs/YYYY-MM-DD_HH/
  ├─ variants/
  ├─ reports/
  └─ metadata.json
```

### Master Dataset

Aggregated view across all runs:
- `master/features.json`
- `master/features.csv`
- `master/feature_diff_stable_vs_other.json`

Used for statistical analysis and feature correlation.

---

## What This Repo Is Not Doing Anymore

- ❌ No new generations
- ❌ No prompt experimentation
- ❌ No new scoring logic
- ❌ No further ingestion

**All future experimentation moves to videoengine-lab.**

---

## Why This Was Frozen

Because the research phase succeeded.

We now know:
- Which architectural traits actually matter
- Which patterns are noise
- Which features predict stability with high confidence

Continuing experimentation here would contaminate the dataset.

---

## Successor Project

**videoengine-lab** will:
- Generate engines programmatically (Playwright-driven)
- Use controlled prompt mutations
- Track lineage, seed, and intent
- Measure deltas against this dataset as a baseline

This repository becomes the ground truth reference.

---

## Quick Reference

### Legacy migration (for archival only)
```bash
npm run migrate:legacy
```

### Analyze existing run
```bash
npm run analyze -- runs/YYYY-MM-DD_HH
```

### Generate statistics
```bash
npm run process:stats -- master/features.json
```

---

## Documentation

- **[MIGRATION_MANIFEST.md](./MIGRATION_MANIFEST.md)** — Known issues & migration notes
- **[ANALYSIS_AND_IMPROVEMENTS.md](./ANALYSIS_AND_IMPROVEMENTS.md)** — Conclusions & insights
- **[DEEP_SYSTEM_ANALYSIS.md](./DEEP_SYSTEM_ANALYSIS.md)** — Deep dive into stability mechanics
- **[spec/](./spec/)** — Formal feature & scoring definitions

---

## Final Note

This repository represents a closed chapter.

It exists so future systems can answer:

> **"Why does this engine behave correctly?"**  
> —not by intuition, but by data.
