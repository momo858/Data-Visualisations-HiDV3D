
// ============================================
// COLUMN DETECTOR CLASS - Intelligently selects columns
// ============================================
class ColumnDetector {
  constructor(data, dataMapper) {
    this.data    = data;
    this.dataMapper = dataMapper;
    this.columns = Object.keys(data[0] || {});
  }

  detectBestColumns() {
    const analyses      = this.columns.map(col => this.dataMapper.analyzeColumn(this.data, col));
    const numericCols   = analyses.filter(a =>  a.isNumeric);
    const categoricalCols = analyses.filter(a => !a.isNumeric);
    let selected = { x: null, y: null, z: null };

    if (numericCols.length >= 3) {
      selected.x = numericCols[0].name;
      selected.y = numericCols[1].name;
      selected.z = numericCols[2].name;
    } else if (numericCols.length >= 2) {
      selected.x = numericCols[0].name;
      selected.y = numericCols[1].name;
      selected.z = categoricalCols[0]?.name || numericCols[0].name;
    } else if (numericCols.length >= 1) {
      selected.x = numericCols[0].name;
      selected.y = categoricalCols[0]?.name || numericCols[0].name;
      selected.z = categoricalCols[1]?.name || categoricalCols[0]?.name;
    } else {
      selected.x = this.columns[0];
      selected.y = this.columns[1] || this.columns[0];
      selected.z = this.columns[2] || this.columns[0];
    }

    return selected;
  }

  getAllColumns() {
    return this.columns.map(col => ({
      name: col,
      ...this.dataMapper.analyzeColumn(this.data, col),
    }));
  }
}
