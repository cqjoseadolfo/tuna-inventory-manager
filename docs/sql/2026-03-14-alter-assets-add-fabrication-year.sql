-- Ejecutar una sola vez en D1 (entorno correspondiente)
-- Agrega el año de fabricación como dato común para todos los activos.

ALTER TABLE assets ADD COLUMN fabrication_year INTEGER;

-- 1) Backfill desde la columna legacy assets.fabrication (si existía)
UPDATE assets
SET fabrication_year = CAST(fabrication AS INTEGER)
WHERE fabrication_year IS NULL
  AND fabrication IS NOT NULL;

-- 2) Backfill desde la tabla de instrumentos para no perder datos históricos.
UPDATE assets
SET fabrication_year = (
  SELECT i.fabrication_year
  FROM asset_instruments i
  WHERE i.asset_id = assets.id
)
WHERE fabrication_year IS NULL;

-- 3) Limpiar columnas legacy
ALTER TABLE assets DROP COLUMN fabrication;
ALTER TABLE asset_instruments DROP COLUMN fabrication_year;
