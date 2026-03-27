-- Run this script in your MySQL Command Line, PHPMyAdmin, or Workbench
-- This will securely delete the old service_records table that still has the dead 'vehicle_id' column attached.

USE vmas_db;

DROP TABLE IF EXISTS service_records;

-- After running this, simply restart your Spring Boot Application.
-- Hibernate will perfectly recreate the table containing only the new 'vehicle_reg_number' constraint!
