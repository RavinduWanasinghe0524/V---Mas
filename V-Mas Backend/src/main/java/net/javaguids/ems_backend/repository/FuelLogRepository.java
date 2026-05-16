package net.javaguids.ems_backend.repository;

import net.javaguids.ems_backend.entity.FuelLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FuelLogRepository extends JpaRepository<FuelLog, Long> {

    @Query("SELECT f FROM FuelLog f WHERE f.vehicleRegNumber = :vehicleRegNumber AND (f.isDeleted = false OR f.isDeleted IS NULL) ORDER BY f.date DESC, f.id DESC")
    List<FuelLog> findByVehicleRegNumberOrderByDateDesc(@Param("vehicleRegNumber") String vehicleRegNumber);

    @Query("SELECT COALESCE(SUM(f.liters), 0.0) FROM FuelLog f WHERE LOWER(TRIM(f.fuelType)) = LOWER(:fuelType) AND MONTH(f.date) = :month AND YEAR(f.date) = :year AND (f.isDeleted = false OR f.isDeleted IS NULL)")
    Double getTotalLitersByFuelType(@Param("fuelType") String fuelType, @Param("month") int month, @Param("year") int year);

    @Query("SELECT COALESCE(SUM(f.totalCost), 0.0) FROM FuelLog f WHERE MONTH(f.date) = :month AND YEAR(f.date) = :year AND (f.isDeleted = false OR f.isDeleted IS NULL)")
    Double getTotalCostForMonth(@Param("month") int month, @Param("year") int year);

    @Query("SELECT f FROM FuelLog f WHERE f.vehicleRegNumber = :vehicleRegNumber AND f.date < :currentDate AND (f.isDeleted = false OR f.isDeleted IS NULL) ORDER BY f.date DESC, f.id DESC")
    List<FuelLog> findPreviousLog(@Param("vehicleRegNumber") String vehicleRegNumber, @Param("currentDate") LocalDate currentDate);

    @Query("SELECT DISTINCT f.vehicleRegNumber FROM FuelLog f WHERE (f.isDeleted = false OR f.isDeleted IS NULL)")
    List<String> findAllDistinctVehicleRegNumbers();

    /**
     * All non-deleted fuel logs for a vehicle, oldest-first (ascending).
     * Used for sequential km/L efficiency calculation across fill-ups.
     */
    @Query("SELECT f FROM FuelLog f WHERE f.vehicleRegNumber = :vehicleRegNumber " +
           "AND (f.isDeleted = false OR f.isDeleted IS NULL) " +
           "ORDER BY f.date ASC, f.id ASC")
    List<FuelLog> findByVehicleRegNumberOrderByDateAscIdAsc(@Param("vehicleRegNumber") String vehicleRegNumber);

    /**
     * Distinct vehicle reg numbers that have at least one non-deleted log.
     */
    @Query("SELECT DISTINCT f.vehicleRegNumber FROM FuelLog f WHERE f.isDeleted = false OR f.isDeleted IS NULL")
    List<String> findAllDistinctActiveVehicleRegNumbers();

    @Query("SELECT MONTH(f.date) as month, f.fuelType, SUM(f.liters) as totalLiters " +
           "FROM FuelLog f WHERE YEAR(f.date) = :year AND (f.isDeleted = false OR f.isDeleted IS NULL) " +
           "GROUP BY MONTH(f.date), f.fuelType " +
           "ORDER BY MONTH(f.date)")
    List<Object[]> getMonthlyConsumptionByFuelType(@Param("year") int year);

    @Query("SELECT COALESCE(SUM(f.totalCost), 0.0) FROM FuelLog f WHERE f.vehicleRegNumber = :vehicleRegNumber AND (f.isDeleted = false OR f.isDeleted IS NULL)")
    Double getTotalSpendingByVehicle(@Param("vehicleRegNumber") String vehicleRegNumber);

    // ---- Driver-scoped queries (with legacy support) ----

    /**
     * Returns logs belonging to this driver PLUS legacy logs (driverUsername IS NULL).
     * This ensures every driver can see their own logs and any old data before the migration.
     */
    @Query("SELECT f FROM FuelLog f WHERE (f.driverUsername = :driverUsername OR f.driverUsername IS NULL) AND (f.isDeleted = false OR f.isDeleted IS NULL) ORDER BY f.date DESC, f.id DESC")
    List<FuelLog> findByDriverUsernameOrLegacy(@Param("driverUsername") String driverUsername);

    @Query("SELECT f FROM FuelLog f WHERE f.isDeleted = true ORDER BY f.deletedAt DESC")
    List<FuelLog> findAllDeleted();

    /**
     * Returns a single log that belongs to this driver OR is a legacy log.
     */
    @Query("SELECT f FROM FuelLog f WHERE f.id = :id AND (f.driverUsername = :driverUsername OR f.driverUsername IS NULL) AND (f.isDeleted = false OR f.isDeleted IS NULL)")
    Optional<FuelLog> findByIdAndDriverUsernameOrLegacy(@Param("id") Long id, @Param("driverUsername") String driverUsername);

    /**
     * Previous log for efficiency notification — driver's own + legacy entries for this vehicle.
     */
    @Query("SELECT f FROM FuelLog f WHERE f.vehicleRegNumber = :vehicleRegNumber AND f.date < :currentDate " +
           "AND (f.driverUsername = :driverUsername OR f.driverUsername IS NULL) " +
           "AND (f.isDeleted = false OR f.isDeleted IS NULL) " +
           "ORDER BY f.date DESC, f.id DESC")
    List<FuelLog> findPreviousLogByDriver(@Param("driverUsername") String driverUsername,
                                          @Param("vehicleRegNumber") String vehicleRegNumber,
                                          @Param("currentDate") LocalDate currentDate);
}
