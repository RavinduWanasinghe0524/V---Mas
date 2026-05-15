package net.javaguids.ems_backend.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * SchemaMigrationConfig
 *
 * Handles one-time schema cleanup that Hibernate's ddl-auto=update cannot
 * perform on its own (removing old columns that no longer exist in entities).
 *
 * Problem: The service_records table was originally created with a vehicle_id
 * column (FK to vehicles). The entity was later refactored to use
 * vehicle_reg_number (a plain VARCHAR). Hibernate's "update" mode adds new
 * columns but NEVER drops old ones, so team members whose databases still have
 * the old vehicle_id column (NOT NULL, no default) get a constraint violation
 * on every INSERT.
 *
 * Fix: On application startup, drop vehicle_id IF IT EXISTS. The IF EXISTS
 * clause makes this a no-op for databases that are already clean.
 */
@Configuration
@RequiredArgsConstructor
public class SchemaMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(SchemaMigrationConfig.class);

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void runMigrations() {
        dropLegacyVehicleIdColumn();
    }

    /**
     * Drops the legacy vehicle_id column from service_records if present.
     * Safe to run on any database — completely no-op when column doesn't exist.
     */
    private void dropLegacyVehicleIdColumn() {
        try {
            // Check if the stale column still exists before attempting to drop it
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() " +
                    "  AND TABLE_NAME   = 'service_records' " +
                    "  AND COLUMN_NAME  = 'vehicle_id'",
                    Integer.class
            );

            if (count != null && count > 0) {
                log.warn("[Migration] Stale 'vehicle_id' column detected in service_records — removing it now...");

                // Drop FK constraint first (name may vary, so we ignore errors)
                try {
                    jdbcTemplate.execute(
                            "ALTER TABLE service_records DROP FOREIGN KEY fk_service_vehicle"
                    );
                    log.info("[Migration] Dropped foreign key fk_service_vehicle");
                } catch (Exception ignored) {
                    // FK may not exist or may have a different name — that's fine
                    log.info("[Migration] No FK named fk_service_vehicle found (already removed or never existed)");
                }

                jdbcTemplate.execute("ALTER TABLE service_records DROP COLUMN vehicle_id");
                log.info("[Migration] Successfully removed stale 'vehicle_id' column from service_records.");
            } else {
                log.debug("[Migration] service_records schema is clean — no action needed.");
            }
        } catch (Exception e) {
            // Log but don't crash — the table may not exist yet (first run),
            // Hibernate will create it correctly immediately after this.
            log.warn("[Migration] Could not check/clean service_records schema: {}", e.getMessage());
        }
    }
}
