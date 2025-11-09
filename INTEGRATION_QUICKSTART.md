# Integration Quick Start Guide

**Agent 10 Coordination - Quick Reference**

For full details, see: `INTEGRATION_PLAN_AGENT_10.md`

---

## TL;DR

**Goal**: Modularize ExportSystem (827 lines) and AlertDetectionEngine (874 lines) using 9 agents coordinated by Agent 10.

**Timeline**: 7 days (~56 hours of agent work)

**Result**:
- ExportSystem: 827 → 150 lines (82% reduction)
- AlertEngine: 874 → 200 lines (77% reduction)
- +1,200 LOC new modules
- +1,000 LOC tests
- 100% backward compatible

---

## Agent Execution Order

### Phase 1: ExportSystem (Days 1-3)

```
Agent 1 → Agent 2 → Agent 3 → Agent 4 → Agent 5
 (4h)      (6h)      (6h)      (4h)      (6h)
Utils → Formats → Processors → Templates → Facade
```

**After Agent 5**: ✅ Verify all 4 consumer files work

### Phase 2: AlertDetectionEngine (Days 4-6)

```
Agent 6 → Agent 7 → Agent 8
 (5h)      (6h)      (5h)
Builders → Aggregation → Orchestration
```

**After Agent 8**: ✅ Verify all 7 consumer files work

### Phase 3: Coordination (Days 1-7, parallel)

```
Agent 9: Cross-module coordination (8h, ongoing)
Agent 10: Integration verification (6h, final)
```

---

## Quick Validation Checklist

After each agent:
```bash
npm run typecheck  # Must pass
npm test           # Must pass
```

After Agent 5 (ExportSystem complete):
```bash
npm test -- src/workers/reports.worker.test.ts
npm test -- src/pages/StudentProfile.test.tsx
```

After Agent 8 (AlertEngine complete):
```bash
npm test -- src/workers/analytics.worker.test.ts
npm test -- src/lib/alerts/__tests__/engine.test.ts
```

Final validation:
```bash
npm run typecheck && npm test && npm run lint
npm run test:performance
npm run analyze
```

---

## Commit Strategy (Recommended)

**9 incremental commits**:

1. `refactor(export): extract utilities (Agent 1)`
2. `refactor(export): extract format handlers (Agent 2)`
3. `refactor(export): extract data processors (Agent 3)`
4. `refactor(export): extract template system (Agent 4)`
5. `refactor(export): convert to facade pattern (Agent 5)` ⚠️ **CHECKPOINT**
6. `refactor(alerts): extract series builders (Agent 6)`
7. `refactor(alerts): extract result aggregation (Agent 7)`
8. `refactor(alerts): convert to thin orchestrator (Agent 8)` ⚠️ **CHECKPOINT**
9. `refactor(shared): add cross-module coordination (Agent 9)`

---

## Emergency Rollback

If critical issue arises:

```bash
# Option 1: Revert last commit
git revert HEAD

# Option 2: Reset to before refactoring (if not pushed)
git reset --hard <commit-before-agent-1>

# Option 3: Bisect to find problematic commit
git bisect start
git bisect bad HEAD
git bisect good <last-known-good>
```

---

## Key Success Metrics

- [ ] TypeScript compiles: `npm run typecheck` ✅
- [ ] Tests pass: `npm test` ✅
- [ ] Lint passes: `npm run lint` ✅
- [ ] Performance maintained: `npm run test:performance` ✅
- [ ] Bundle size stable: `npm run analyze` ✅
- [ ] 4 ExportSystem consumers work ✅
- [ ] 7 AlertEngine consumers work ✅
- [ ] Test coverage >85% for new modules ✅
- [ ] Documentation updated ✅

---

## File Structure Preview

### ExportSystem (After)
```
src/lib/exportSystem/
├── ExportSystem.ts (~150 lines)
├── utils/          # Agent 1
├── formats/        # Agent 2
├── processors/     # Agent 3
├── templates/      # Agent 4
└── __tests__/
```

### AlertDetectionEngine (After)
```
src/lib/alerts/
├── engine.ts (~200 lines)
├── builders/       # Agent 6
├── aggregation/    # Agent 7
├── detectors/      # (already exists)
└── __tests__/
```

---

## Agent Task Summary

| Agent | Task | Time | Critical Path |
|-------|------|------|---------------|
| 1 | Export utilities | 4h | Yes (foundation) |
| 2 | Export format handlers | 6h | Yes |
| 3 | Export processors | 6h | Yes |
| 4 | Export templates | 4h | Yes |
| 5 | Export facade | 6h | Yes (checkpoint) |
| 6 | Alert builders | 5h | Yes |
| 7 | Alert aggregation | 6h | Yes |
| 8 | Alert orchestration | 5h | Yes (checkpoint) |
| 9 | Cross-module coord | 8h | No (parallel) |
| 10 | Integration coord | 6h | Yes (final) |

---

## Next Steps

1. **Review** `INTEGRATION_PLAN_AGENT_10.md` in detail
2. **Tag** current state: `git tag before-agent-1`
3. **Start** with Agent 1 (export utilities)
4. **Validate** after each agent
5. **Checkpoint** after Agents 5 and 8
6. **Celebrate** when Agent 10 certifies completion! 🎉

---

## Questions or Issues?

Refer to full integration plan sections:
- **Part 1**: Dependency Graph
- **Part 2**: Detailed Extraction Plans
- **Part 3**: Integration Points
- **Part 4**: Step-by-Step Instructions
- **Part 7**: Issue Mitigations
- **Part 8**: Rollback Procedures

---

**Generated**: 2025-11-09
**Coordinator**: Agent 10
**Full Plan**: `INTEGRATION_PLAN_AGENT_10.md` (10,000+ words)
