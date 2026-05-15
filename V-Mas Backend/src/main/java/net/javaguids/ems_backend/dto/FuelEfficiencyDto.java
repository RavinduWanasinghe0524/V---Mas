package net.javaguids.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * Full fuel-efficiency report response.
 *
 * Top-level: summary stats across the whole fleet.
 * Per-vehicle: each fill-up's computed km/L efficiency.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FuelEfficiencyDto {

    /** Fleet-wide average efficiency (km/L), null if insufficient data */
    private Double fleetAverageEfficiency;

    /** Number of vehicles included in the report */
    private Integer totalVehicles;

    /** Number of vehicles with good efficiency (>= 10 km/L) */
    private Integer goodEfficiencyCount;

    /** Number of vehicles with moderate efficiency (5–9.99 km/L) */
    private Integer moderateEfficiencyCount;

    /** Number of vehicles with low efficiency (< 5 km/L) */
    private Integer lowEfficiencyCount;

    /** Per-vehicle efficiency breakdown */
    private List<VehicleEfficiencyRecord> vehicles;

    // ── Nested record for one vehicle ─────────────────────────────────────

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VehicleEfficiencyRecord {

        private String vehicleRegNumber;

        /** Latest computed km/L for this vehicle (between last two fill-ups) */
        private Double latestEfficiency;

        /** Average km/L across all consecutive fill-up pairs */
        private Double averageEfficiency;

        /** Human-readable status: "Good", "Moderate", "Low Efficiency", "Insufficient Data" */
        private String efficiencyStatus;

        /** Total liters consumed (all logs) */
        private Double totalLiters;

        /** Total fuel cost (all logs) */
        private Double totalCost;

        /** Cost per km driven (total cost / total km driven) */
        private Double costPerKm;

        /** Ordered list of per-fill-up efficiency readings */
        private List<FillUpRecord> fillUps;
    }

    // ── Nested record for one fill-up interval ────────────────────────────

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FillUpRecord {

        private LocalDate date;

        /** Mileage recorded at this fill-up */
        private Double mileage;

        /** Liters added at this fill-up */
        private Double liters;

        /** Total cost of this fill-up */
        private Double cost;

        /**
         * km/L efficiency between this fill-up and the previous one.
         * Null for the very first log entry (no previous reference).
         */
        private Double efficiencyKmPerLiter;

        /** km driven since the last fill-up (null for first entry) */
        private Double kmDriven;
    }
}
