CREATE TABLE IF NOT EXISTS datasets (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  filename    VARCHAR(255) NOT NULL,
  row_count   INT,
  columns     TEXT[],
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visualisations (
  id         SERIAL PRIMARY KEY,
  dataset_id INT REFERENCES datasets(id) ON DELETE CASCADE,
  x_col      VARCHAR(255),
  y_col      VARCHAR(255),
  z_col      VARCHAR(255),
  camera_pos JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
