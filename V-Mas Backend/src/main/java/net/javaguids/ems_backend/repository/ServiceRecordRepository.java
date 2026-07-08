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

    List<ServiceRecord> findByVehicleRegNumberAndServiceTypeAndDeletedFalseOrderByCurrentMileageKmDesc(
            String vehicleRegNumber, net.javaguids.ems_backend.enums.ServiceType serviceType);

    /** Returns the 5 most recent non-deleted records ordered by service date. */
    List<ServiceRecord> findTop5ByDeletedFalseOrderByServiceDateDesc();

    /** Returns non-deleted records whose nextServiceDue falls within the given range. */
    List<ServiceRecord> findByNextServiceDueBetweenAndDeletedFalseOrderByNextServiceDueAsc(
            java.time.LocalDate startDate, java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Query(
        "SELECT SUM(sr.serviceCost) FROM ServiceRecord sr WHERE sr.deleted = false AND sr.status = 'APPROVED'")
    java.math.BigDecimal getTotalServiceCost();

    @org.springframework.data.jpa.repository.Query(
        "SELECT sr.serviceType, COUNT(sr) FROM ServiceRecord sr WHERE sr.deleted = false AND sr.status = 'APPROVED' GROUP BY sr.serviceType")
    List<Object[]> countServicesByType();

    /**
     * Finds the absolute latest ACTIVE service record per (vehicle, serviceType) combination.
     * Used for dashboard service-due alert checking.
     */
    @org.springframework.data.jpa.repository.Query(
        "SELECT sr FROM ServiceRecord sr " +
        "WHERE sr.deleted = false AND sr.status = 'APPROVED' " +
        "AND sr.id IN (SELECT MAX(sr2.id) FROM ServiceRecord sr2 " +
        "              WHERE sr2.deleted = false AND sr2.status = 'APPROVED' " +
        "              GROUP BY sr2.vehicleRegNumber, sr2.serviceType)"
    )
    List<ServiceRecord> findLatestServiceRecordPerVehicleAndServiceType();

    // ── Soft-deleted records ────────────────────────────────────────────────

    /** Returns all soft-deleted records, newest deleted first. */
    @org.springframework.data.jpa.repository.Query(
        "SELECT sr FROM ServiceRecord sr WHERE sr.deleted = true ORDER BY sr.deletedAt DESC")
    List<ServiceRecord> findAllDeleted();
}
