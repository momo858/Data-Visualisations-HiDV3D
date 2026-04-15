// ============================================
// DATA MAPPER CLASS - Handles data transformation
// ============================================
class DataMapper {
  constructor() {
    this.categoryMaps = new Map();
    this.normStats    = new Map(); // stores per-column stats for legend
  }

  analyzeColumn(data, columnName) {
    const values       = data.map(row => row[columnName]).filter(v => v != null);
    const numericValues = values.filter(v => typeof v === 'number' || !isNaN(parseFloat(v)));
    const isNumeric    = numericValues.length > values.length * 0.8;
    return {
      name:        columnName,
      isNumeric:   isNumeric,
      uniqueCount: new Set(values).size,
      sampleValues: values.slice(0, 5),
    };
  }

  // ── Normalisation helpers ─────────────────────────────

  _minMax(values, outMin = 0, outMax = 10) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map(v => ((v - min) / range) * (outMax - outMin) + outMin);
  }

  _zScore(values, outMin = 0, outMax = 10) {
    const mean   = values.reduce((a, b) => a + b, 0) / values.length;
    const std    = Math.sqrt(values.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / values.length) || 1;
    const zVals  = values.map(v => (v - mean) / std);
    return this._minMax(zVals, outMin, outMax); // rescale z-scores to 0-10
  }

  _clampOutliers(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const q1     = sorted[Math.floor(sorted.length * 0.25)];
    const q3     = sorted[Math.floor(sorted.length * 0.75)];
    const iqr    = q3 - q1;
    if (iqr === 0) return values;
    return values.map(v => Math.min(Math.max(v, q1 - 1.5 * iqr), q3 + 1.5 * iqr));
  }

  _isSkewed(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const max    = sorted[sorted.length - 1];
    return median > 0 && max / median > 10;
  }

  // ── Categorical encoding ──────────────────────────────

  createCategoryMapping(data, columnName) {
    const uniqueValues = [...new Set(data.map(row => row[columnName]).filter(v => v != null))];
    const mapping = new Map();
    uniqueValues.forEach((value, index) => mapping.set(value, index));
    this.categoryMaps.set(columnName, mapping);
    return mapping;
  }

  getCategoryMapping(columnName) {
    return this.categoryMaps.get(columnName);
  }

  getNormStats(columnName) {
    return this.normStats.get(columnName);
  }

  // ── Adaptive normalisation pipeline ──────────────────
  // Order: type check → outlier clamp → skew → sign → scale

  normaliseColumn(values, columnName) {
    const numericRaw = values.map(v => typeof v === 'number' ? v : parseFloat(v));
    const allNumeric = numericRaw.every(v => !isNaN(v));

    // Categorical: evenly spaced 0–10
    if (!allNumeric) {
      const unique = [...new Set(values)].sort();
      const mapped = values.map(v => unique.length > 1
        ? (unique.indexOf(v) / (unique.length - 1)) * 10
        : 5
      );
      this.normStats.set(columnName, { method: 'categorical', uniqueCount: unique.length });
      return mapped;
    }

    const hasNegatives = numericRaw.some(v => v < 0);
    const method_log   = this._isSkewed(numericRaw) && !hasNegatives;

    // Step 1 — clamp outliers
    let processed = this._clampOutliers(numericRaw);

    // Step 2 — log transform if skewed (only safe for non-negatives)
    if (method_log) {
      processed = processed.map(v => Math.log1p(Math.abs(v)));
    }

    // Step 3 — z-score for negatives, min-max for everything else
    let normalised;
    let method;
    if (hasNegatives) {
      normalised = this._zScore(processed);
      method = 'z-score';
    } else {
      normalised = this._minMax(processed);
      method = method_log ? 'log + min-max' : 'min-max';
    }

    this.normStats.set(columnName, {
      method,
      min:  Math.min(...numericRaw),
      max:  Math.max(...numericRaw),
      hasNegatives,
      wasSkewed: method_log,
    });

    return normalised;
  }

  // ── Public: map column to normalised numeric array ────

  mapToNumeric(data, columnName) {
    const analysis = this.analyzeColumn(data, columnName);
    const values   = data.map(row => row[columnName]);

    if (analysis.isNumeric) {
      return this.normaliseColumn(values, columnName);
    } else {
      const mapping = this.createCategoryMapping(data, columnName);
      const raw     = data.map(row => mapping.get(row[columnName]) ?? 0);
      // evenly space categories across 0–10
      const max = mapping.size - 1 || 1;
      return raw.map(v => (v / max) * 10);
    }
  }
}
