-- Ensure fuel_logs mileage column is consistently named current_mileage.
-- Handles the common mixed-schema state where both mileage and current_mileage exist.

SET @has_table := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'fuel_logs'
);

SET @has_mileage := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'fuel_logs'
    AND column_name = 'mileage'
);

SET @has_current := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'fuel_logs'
    AND column_name = 'current_mileage'
);

-- If only mileage exists, rename it to current_mileage.
SET @sql := IF(
  @has_table = 1 AND @has_mileage = 1 AND @has_current = 0,
  'ALTER TABLE fuel_logs CHANGE COLUMN mileage current_mileage DOUBLE NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Refresh column flags after rename.
SET @has_mileage := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'fuel_logs'
    AND column_name = 'mileage'
);
SET @has_current := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'fuel_logs'
    AND column_name = 'current_mileage'
);

-- If both exist, backfill current_mileage and drop the legacy mileage column.
SET @sql := IF(
  @has_table = 1 AND @has_mileage = 1 AND @has_current = 1,
  'UPDATE fuel_logs SET current_mileage = mileage WHERE (current_mileage IS NULL OR current_mileage = 0) AND mileage IS NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @has_table = 1 AND @has_mileage = 1 AND @has_current = 1,
  'ALTER TABLE fuel_logs DROP COLUMN mileage',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure current_mileage is NOT NULL when it exists.
SET @sql := IF(
  @has_table = 1 AND @has_current = 1,
  'ALTER TABLE fuel_logs MODIFY COLUMN current_mileage DOUBLE NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
