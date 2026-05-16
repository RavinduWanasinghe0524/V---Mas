package net.javaguids.ems_backend.repository;

import net.javaguids.ems_backend.entity.ServiceRecordAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRecordAuditRepository extends JpaRepository<ServiceRecordAudit, Long> {

    /**
     * Returns all audit entries for a given service record, newest first.
     */
    List<ServiceRecordAudit> findByServiceRecordIdOrderByChangedAtDesc(Long serviceRecordId);
}
