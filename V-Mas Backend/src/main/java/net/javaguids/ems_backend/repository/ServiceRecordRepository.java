package net.javaguids.ems_backend.repository;

import net.javaguids.ems_backend.entity.ServiceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRecordRepository
        extends JpaRepository<ServiceRecord, Long>, JpaSpecificationExecutor<ServiceRecord> {

    // ── Active (non-deleted) queries ────────────────────────────────────────

    /** Returns all non-deleted records for a specific vehicle. */
    List<ServiceRecord> findByVehicleRegNumberAndDeletedFalse(String vehicleRegNumber);

    /** Returns the 5 most recent non-deleted records ordered by service date. */
    List<ServiceRecord> findTop5ByDeletedFalseOrderByServiceDateDesc();

    /** Returns non-deleted records whose nextServiceDue falls within the given range. */
    List<ServiceRecord> findByNextServiceDueBetweenAndDeletedFalseOrderByNextServiceDueAsc(
            java.time.LocalDate startDate, java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Query(
        "SELECT SUM(sr.serviceCost) FROM ServiceRecord sr WHERE sr.deleted = false")
    java.math.BigDecimal getTotalServiceCost();

    @org.springframework.data.jpa.repository.Query(
        "SELECT sr.serviceType, COUNT(sr) FROM ServiceRecord sr WHERE sr.deleted = false GROUP BY sr.serviceType")
    List<Object[]> countServicesByType();

    /**
     * Finds the latest ACTIVE service record per vehicle that has a nextServiceDue or nextServiceMileageKm set.
     * Used for dashboard service-due alert checking.
     */
    @org.springframework.data.jpa.repository.Query(
        "SELECT sr FROM ServiceRecord sr " +
        "WHERE sr.deleted = false " +
        "AND (sr.nextServiceDue IS NOT NULL OR sr.nextServiceMileageKm IS NOT NULL) " +
        "AND sr.id = (SELECT MAX(sr2.id) FROM ServiceRecord sr2 " +
        "             WHERE sr2.vehicleRegNumber = sr.vehicleRegNumber " +
        "             AND sr2.deleted = false " +
        "             AND (sr2.nextServiceDue IS NOT NULL OR sr2.nextServiceMileageKm IS NOT NULL))"
    )
    List<ServiceRecord> findLatestServiceRecordWithDueDatePerVehicle();

    // ── Soft-deleted records ────────────────────────────────────────────────

    /** Returns all soft-deleted records, newest deleted first. */
    @org.springframework.data.jpa.repository.Query(
        "SELECT sr FROM ServiceRecord sr WHERE sr.deleted = true ORDER BY sr.deletedAt DESC")
    List<ServiceRecord> findAllDeleted();
}
