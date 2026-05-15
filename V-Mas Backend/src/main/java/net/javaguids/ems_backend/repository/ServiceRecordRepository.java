package net.javaguids.ems_backend.repository;

import net.javaguids.ems_backend.entity.ServiceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRecordRepository
        extends JpaRepository<ServiceRecord, Long>, JpaSpecificationExecutor<ServiceRecord> {

    List<ServiceRecord> findByVehicleRegNumber(String vehicleRegNumber);

    List<ServiceRecord> findTop5ByOrderByServiceDateDesc();

    List<ServiceRecord> findByNextServiceDueBetweenOrderByNextServiceDueAsc(
            java.time.LocalDate startDate, java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Query("SELECT SUM(sr.serviceCost) FROM ServiceRecord sr")
    java.math.BigDecimal getTotalServiceCost();

    @org.springframework.data.jpa.repository.Query("SELECT sr.serviceType, COUNT(sr) FROM ServiceRecord sr GROUP BY sr.serviceType")
    List<Object[]> countServicesByType();

    /**
     * Finds the latest service record for each vehicle that has a nextServiceDue set.
     * Used for dashboard service-due alert checking.
     */
    @org.springframework.data.jpa.repository.Query(
        "SELECT sr FROM ServiceRecord sr " +
        "WHERE (sr.nextServiceDue IS NOT NULL OR sr.nextServiceMileageKm IS NOT NULL) " +
        "AND sr.id = (SELECT MAX(sr2.id) FROM ServiceRecord sr2 " +
        "             WHERE sr2.vehicleRegNumber = sr.vehicleRegNumber " +
        "             AND (sr2.nextServiceDue IS NOT NULL OR sr2.nextServiceMileageKm IS NOT NULL))"
    )
    List<ServiceRecord> findLatestServiceRecordWithDueDatePerVehicle();
}

