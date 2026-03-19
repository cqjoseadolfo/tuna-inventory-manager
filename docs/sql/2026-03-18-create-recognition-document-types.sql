-- Catalog for recognition document types
CREATE TABLE IF NOT EXISTS recognition_document_types (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO recognition_document_types (code, label, is_active, sort_order) VALUES
  ('trofeo', 'Trofeo', 1, 10),
  ('certificado', 'Certificado', 1, 20),
  ('grillete', 'Grillete', 1, 30),
  ('estandarte', 'Estandarte', 1, 40),
  ('placa', 'Placa', 1, 50),
  ('medalla', 'Medalla', 1, 60);

CREATE INDEX IF NOT EXISTS idx_recognition_document_types_active_sort
  ON recognition_document_types (is_active, sort_order);
