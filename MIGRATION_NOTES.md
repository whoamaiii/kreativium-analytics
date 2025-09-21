# Migration from kreativiumbeta2

## Import Summary

This commit represents the import of the kreativiumbeta2 project into the KreativiumV17 repository.

## What was Imported

### Core Application

- `dist/` - Complete built application ready for deployment
- `dist/index.html` - Main application entry point
- `dist/robots.txt` - Search engine directives

### AI/ML Components

- `dist/models/gemma3-270m-it/` - Gemma model configuration
- Worker files for analytics, AI processing, and reports

### Configuration

- `.gitignore` - Updated to exclude large binary files
- `.husky/` - Git hooks configuration

## What was Excluded

### Large Binary Files

- `*.onnx` model files (too large for git)
- `*.bin` and `*.safetensors` files
- WASM runtime files

### Development Environment

- `node_modules/` directory
- Python virtual environment (`mlx-backend/venv/`)

### Generated Files

- Build artifacts that can be regenerated
- Temporary files and logs

## Next Steps

1. Set up development environment
2. Install dependencies
3. Download required model files
4. Configure ML backend
5. Test deployment

## Notes

- The original project was connected to `Kreativiumv18Gemma.git`
- This import preserves the essential application structure
- Large files will need to be downloaded separately for full functionality

## Charting Library Consolidation (Nivo → ECharts)

### Removed Components
- `src/components/optimized/OptimizedCorrelationHeatmap.tsx`
- `src/components/CorrelationHeatmap.tsx`
- `src/components/PredictionTimeline.tsx`

These Nivo-based components were unused and have been removed to consolidate on ECharts.

### Migration Path
- Correlation heatmaps: use `buildCorrelationHeatmapOption` from `src/components/charts/ChartKit.ts`.
- Prediction timeline: use `buildPredictionTimelineOption` from `src/components/charts/ChartKit.ts` to render a line chart over time for risk scores.

### Performance Optimizations
- The ECharts correlation heatmap component `src/components/analysis/CorrelationHeatmap.tsx` now memoizes chart options with `useMemo` and is exported via `React.memo` with a custom prop comparer (factors shallow-compare, matrix dimension checks, and sampled value comparisons) to minimize re-renders.

### Dependency Changes
- Removed `@nivo/heatmap` from `package.json` dependencies.

### Bundle Impact
- Removing Nivo reduces the bundle size. Run `npm run analyze` to regenerate `artifacts/bundle-stats.html` and compare against previous reports.

## Cleanup Completion: PredictionTimeline References

All stale references to the removed `src/components/PredictionTimeline.tsx` component have been removed from `performance-report.json`. The ECharts replacement `buildPredictionTimelineOption` in `src/components/charts/ChartKit.ts` remains the supported path for timeline visualizations.

## Unused Exports Tooling

A lightweight analysis script has been added to help detect dead code:

- Run `npm run unused-exports` to generate `artifacts/unused-exports-top.json` and a companion markdown report.
- Run `npm run cleanup` to apply lint fixes and regenerate the unused exports report in one go.

Notes:
- The analysis is heuristic and excludes tests, stories, config files, and common index barrels.
- Re-exports and dynamic usage may require manual confirmation before deletion.

## Ongoing Maintenance

- Periodically run `npm run cleanup` before releases to keep the codebase tidy.
- Update performance artifacts with `npm run analyze` to ensure reports reflect current code after migrations.
