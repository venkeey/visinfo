# HAC.ts Refactoring Plan

## Current State
- **File:** hac.ts
- **Lines:** 1,311
- **Issues:**
  - Main function `hacCluster()` is 390 lines (lines 331-720)
  - Multiple concerns mixed together
  - Hard to test individual pieces
  - Poor maintainability

## Proposed Module Structure

### 1. `hacAdaptiveConfig.ts` (~200 lines)
**Purpose:** Adaptive parameter calculation and configuration

**Exports:**
- `computeAdaptiveMinClusterSize()`
- `computeAdaptiveMaxClusters()`
- `calculateDataDensity()`
- `computeAdaptiveOutlierThreshold()`

**Why separate:** Pure mathematical functions with no dependencies on clustering logic

---

### 2. `hacPresets.ts` (~150 lines)
**Purpose:** Preset configurations (merging with existing preset logic)

**Exports:**
- `PresetConfig` interface
- `ClusteringPreset` type
- `applyPreset()` (legacy, n-based)
- `applyDataDrivenPreset()` (modern, data-driven)

**Why separate:** Configuration logic separate from execution

---

### 3. `hacTreeUtils.ts` (~400 lines)
**Purpose:** Dendrogram tree manipulation and analysis

**Exports:**
- `getNodeSize()`
- `enforceMinSizeByParentBackup()`
- `extractLabelsFromTree()`
- `getClusters()`
- `getLeafIndices()`
- `extractHierarchy()`
- `calculateTreeDepth()`
- `MergeHeightAnalysis` interface
- `analyzeMergeHeights()`
- `estimateOptimalK()`

**Why separate:** Tree-specific logic isolated from clustering

---

### 4. `hacMetrics.ts` (~200 lines)
**Purpose:** Metric calculations

**Exports:**
- `buildDistanceMatrix()`
- `calculateSilhouetteScoreEfficient()`
- `calculateClusterSizes()`
- `calculateCentroids()`

**Why separate:** Reusable metric functions

---

### 5. `hacCore.ts` (NEW - ~100 lines)
**Purpose:** Core clustering orchestration helper functions

**Functions to extract from hacCluster():**
- `setupClusteringParameters()` - Lines 337-434
- `performClustering()` - Lines 436-478
- `runCoherenceCheck()` - Lines 530-653
- `buildClusteringResult()` - Lines 665-719

---

### 6. `hac.ts` (MAIN - ~300 lines)
**Purpose:** Main entry point and orchestration

**Keeps:**
- `HACOptions` interface
- `hacCluster()` main function (REFACTORED to use helpers)
- Imports from split modules
- Re-exports for backward compatibility

---

## Migration Strategy

### Phase 1: Extract Pure Functions (Low Risk)
1. Create `hacAdaptiveConfig.ts` - no dependencies
2. Create `hacMetrics.ts` - minimal dependencies
3. Update `hac.ts` imports

### Phase 2: Extract Tree Utils (Medium Risk)
4. Create `hacTreeUtils.ts` - tree manipulation functions
5. Update `hac.ts` imports

### Phase 3: Extract Presets (Low Risk)
6. Create `hacPresets.ts` - merge with existing preset logic
7. Update `hac.ts` imports

### Phase 4: Refactor Main Function (High Risk)
8. Create `hacCore.ts` with helper functions
9. Refactor `hacCluster()` to use helpers
10. Test thoroughly

### Phase 5: Cleanup
11. Update `index.ts` to re-export from new files
12. Run tests
13. Update documentation

---

## File Dependencies

```
hacAdaptiveConfig.ts  (0 deps - pure functions)
    ↓
hacMetrics.ts  (depends on: utils.ts)
    ↓
hacTreeUtils.ts  (depends on: hacMetrics, ml-hclust)
    ↓
hacPresets.ts  (depends on: hacAdaptiveConfig, regimeClassifier, legacyPresets)
    ↓
hacCore.ts  (depends on: all above, coherenceCheck, twoPhaseCluster)
    ↓
hac.ts  (depends on: all above - main orchestrator)
```

---

## Expected Benefits

1. **Testability:** Each module can be unit tested independently
2. **Maintainability:** Smaller files are easier to understand
3. **Reusability:** Functions can be imported individually
4. **Type Safety:** Better type inference with smaller modules
5. **Code Navigation:** Easier to find specific functionality

---

## Backward Compatibility

- Main `hac.ts` will re-export all public functions
- Existing imports from `./hac` will continue to work
- No breaking changes for consumers

---

## Success Criteria

✅ All tests pass
✅ No TypeScript errors
✅ Total lines of code unchanged (just reorganized)
✅ `hacCluster()` function < 150 lines
✅ No file > 400 lines
✅ Each module has single responsibility
