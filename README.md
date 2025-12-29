# Videoengine R&D

> **⚠️ ARCHIVED REPOSITORY / FROZEN**  
> This repository is archived and no longer maintained. It serves as a research artifact for analyzing LLM-generated animation engines and static code analysis.  
> **This is NOT production code, NOT a runtime validator, NOT an active project.**  
> **Successor**: videoengine-lab (link will be added after creation)

---

R&D project for generating animation engines using Gemini.

## Quick Start

### Legacy Data Migration

If you have data in `data/`, migrate it:

```bash
npm run migrate:legacy
```

### New Run

1. Create directory: `mkdir runs/2025-12-29_01`
2. Place zip files in `runs/2025-12-29_01/zips/`
3. Run ingest: `npm run ingest -- runs/2025-12-29_01`

## Structure

- `/runs/` - all generation runs (run-based format)
- `/master/` - aggregated dataset and configuration
- `/data/` - legacy data (will be migrated to `runs/legacy_01/`)
- `/spec/` - project specifications (schema, classification rules, compliance rules, scoring rules)
- `/scripts/` - analysis and processing scripts

For more details, see [README_RUNS.md](./README_RUNS.md)

## Commands

- `npm run ingest -- runs/YYYY-MM-DD_HH` - ingest a new run
- `npm run migrate:legacy` - migrate legacy data
- `npm run analyze -- <path>` - analyze variants
- `npm run process:stats -- <json>` - statistics on results

## Documentation

- [MIGRATION_MANIFEST.md](./MIGRATION_MANIFEST.md) - Migration guidelines and known issues
- [ANALYSIS_AND_IMPROVEMENTS.md](./ANALYSIS_AND_IMPROVEMENTS.md) - System analysis and improvements
- [DEEP_SYSTEM_ANALYSIS.md](./DEEP_SYSTEM_ANALYSIS.md) - Deep technical analysis
- [spec/](./spec/) - Project specifications (dataset schema, classification rules, compliance rules, scoring rules)

## Important Notes

⚠️ **DO NOT COPY LEGACY SEMANTICS** - The classification system has known bugs. See [MIGRATION_MANIFEST.md](./MIGRATION_MANIFEST.md) for details.

⚠️ **Scoring v2 requires recalculation** - Current `master/scoring_v2.json` and `master/feature_diff_stable_vs_other.json` are based on incorrect classification and should be recalculated after fixing the classification logic.
