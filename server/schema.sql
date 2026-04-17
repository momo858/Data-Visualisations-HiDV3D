CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS datasets (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  filename   VARCHAR(255),
  row_count  INTEGER,
  columns    JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visualisations (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  dataset_id INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
  x_col      VARCHAR(255),
  y_col      VARCHAR(255),
  z_col      VARCHAR(255),
  color_col  VARCHAR(255),
  camera_pos JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);