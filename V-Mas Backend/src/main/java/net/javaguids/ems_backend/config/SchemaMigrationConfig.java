package net.javaguids.ems_backend.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

/**
 * SchemaMigrationConfig
 *
 * Handles one-time schema cleanup that Hibernate's ddl-auto=update cannot
 * perform on its own (removing stale columns, relaxing NOT NULL constraints).
 *
 * Hibernate "update" mode:
 *  - Adds new columns  ✓
 *  - Renames columns   ✗
 *  - Drops old columns ✗
 *  - Changes nullable  ✗
 *
 * All migrations are idempotent — safe no-ops when already applied.
 */
@Configuration
@RequiredArgsConstructor
public class SchemaMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(SchemaMigrationConfig.class);

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void runMigrations() {
        dropLegacyVehicleIdColumn();
        dropLegacyCurrentMileageColumn();
        makeDriverUsernameNullable();
        dropStaleVehicleCheckConstraints();
    }

    // ── Migration 1 ─────────────────────────────────────────────────────────

    /**
     * Drops the legacy vehicle_id column from service_records if present.
     *
     * The service_records table was originally created with a vehicle_id FK column.
     * The entity was later refactored to use vehicle_reg_number (plain VARCHAR).
     * Hibernate never dropped the old column, leaving a NOT NULL / no-default
     * column that breaks every INSERT.
     */
    private void dropLegacyVehicleIdColumn() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() " +
                    "  AND TABLE_NAME   = 'service_records' " +
                    "  AND COLUMN_NAME  = 'vehicle_id'",
                    Integer.class
            );

            if (count != null && count > 0) {
                log.warn("[Migration] Stale 'vehicle_id' column detected in service_records — removing it now...");

                // Drop any FK constraints first
                List<String> fkNames = jdbcTemplate.queryForList(
                        "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE " +
                        "WHERE TABLE_SCHEMA = DATABASE() " +
                        "  AND TABLE_NAME = 'service_records' " +
                        "  AND COLUMN_NAME = 'vehicle_id' " +
                        "  AND REFERENCED_TABLE_NAME IS NOT NULL",
                        String.class
                );
                for (String fk : fkNames) {
                    try {
                        jdbcTemplate.execute("ALTER TABLE service_records DROP FOREIGN KEY " + fk);
                        log.info("[Migration] Dropped foreign key: {}", fk);
                    } catch (Exception ex) {
                        log.warn("[Migration] Could not drop foreign key {}: {}", fk, ex.getMessage());
                    }
                }

                jdbcTemplate.execute("ALTER TABLE service_records DROP COLUMN vehicle_id");
                log.info("[Migration] Successfully removed stale 'vehicle_id' column from service_records.");
            } else {
                log.debug("[Migration] service_records.vehicle_id — already clean, no action needed.");
            }
        } catch (Exception e) {
            log.warn("[Migration] Could not check/clean service_records schema: {}", e.getMessage());
        }
    }

    // ── Migration 2 ─────────────────────────────────────────────────────────

    /**
     * Drops the stale current_mileage column from fuel_logs if present.
     *
     * The fuel_logs table was created with a current_mileage column (NOT NULL,
     * no default) that no longer exists in the FuelLog entity. Every INSERT
     * into fuel_logs fails with "Field 'current_mileage' doesn't have a default value".
     */
    private void dropLegacyCurrentMileageColumn() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() " +
                    "  AND TABLE_NAME   = 'fuel_logs' " +
                    "  AND COLUMN_NAME  = 'current_mileage'",
                    Integer.class
            );

            if (count != null && count > 0) {
                log.warn("[Migration] Stale 'current_mileage' column detected in fuel_logs — removing it now...");
                jdbcTemplate.execute("ALTER TABLE fuel_logs DROP COLUMN current_mileage");
                log.info("[Migration] Successfully removed stale 'current_mileage' column from fuel_logs.");
            } else {
                log.debug("[Migration] fuel_logs.current_mileage — already clean, no action needed.");
            }
        } catch (Exception e) {
            log.warn("[Migration] Could not check/clean fuel_logs.current_mileage: {}", e.getMessage());
        }
    }

    // ── Migration 3 ─────────────────────────────────────────────────────────

    /**
     * Makes driver_username and uploaded_by nullable in fuel_logs.
     *
     * These columns were created as NOT NULL in an earlier schema version, but the
     * FuelLog entity declares them nullable=true. Hibernate never relaxes NOT NULL
     * on existing columns, so controller-added logs (driverUsername is optional)
     * fail with "Column 'driver_username' cannot be null".
     */
    private void makeDriverUsernameNullable() {
        try {
            String isNullable = jdbcTemplate.queryForObject(
                    "SELECT IS_NULLABLE FROM information_schema.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() " +
                    "  AND TABLE_NAME   = 'fuel_logs' " +
                    "  AND COLUMN_NAME  = 'driver_username'",
                    String.class
            );

            if ("NO".equals(isNullable)) {
                log.warn("[Migration] 'driver_username' in fuel_logs is NOT NULL — altering to NULL now...");
                jdbcTemplate.execute(
                    "ALTER TABLE fuel_logs " +
                    "  MODIFY COLUMN driver_username VARCHAR(255) NULL, " +
                    "  MODIFY COLUMN uploaded_by    VARCHAR(255) NULL"
                );
                log.info("[Migration] Successfully made driver_username/uploaded_by nullable in fuel_logs.");
            } else {
                log.debug("[Migration] fuel_logs.driver_username — already nullable, no action needed.");
            }
        } catch (Exception e) {
            log.warn("[Migration] Could not update fuel_logs nullable constraints: {}", e.getMessage());
        }
    }

    // ── Migration 4 ─────────────────────────────────────────────────────────

    /**
     * Drops stale check constraints 'vehicles_chk_1' and 'vehicles_chk_2' from the vehicles table.
     *
     * These check constraints (e.g. status between 0 and 3) were generated by Hibernate
     * when the enums were mapped as ORDINALs. Later, the entity was changed to EnumType.STRING,
     * but Hibernate does not clean up stale constraints, which fails updates with check constraint violation.
     */
    private void dropStaleVehicleCheckConstraints() {
        try {
            dropCheckConstraintIfExists("vehicles", "vehicles_chk_1");
            dropCheckConstraintIfExists("vehicles", "vehicles_chk_2");
        } catch (Exception e) {
            log.warn("[Migration] Could not check/drop vehicles check constraints: {}", e.getMessage());
        }
    }

    private void dropCheckConstraintIfExists(String tableName, String constraintName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS " +
                    "WHERE TABLE_SCHEMA = DATABASE() " +
                    "  AND TABLE_NAME   = ? " +
                    "  AND CONSTRAINT_NAME = ?",
                    Integer.class,
                    tableName,
                    constraintName
            );

            if (count != null && count > 0) {
                log.warn("[Migration] Stale check constraint '{}' detected on table '{}' — removing it now...", constraintName, tableName);
                jdbcTemplate.execute("ALTER TABLE " + tableName + " DROP CHECK " + constraintName);
                log.info("[Migration] Successfully removed constraint '{}' from table '{}'.", constraintName, tableName);
            } else {
                log.debug("[Migration] {}.{} — constraint not present, no action needed.", tableName, constraintName);
            }
        } catch (Exception e) {
            log.warn("[Migration] Error checking or dropping constraint '{}' on table '{}': {}", constraintName, tableName, e.getMessage());
        }
    }
}
