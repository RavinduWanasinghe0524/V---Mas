package net.javaguids.ems_backend.service;

import net.javaguids.ems_backend.dto.ServiceFilterRequest;
import net.javaguids.ems_backend.dto.ServiceRecordDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ServiceRecordService {

    ServiceRecordDto createServiceRecord(ServiceRecordDto dto);

    ServiceRecordDto getServiceRecordById(Long id);

    List<ServiceRecordDto> getAllServiceRecords();

    ServiceRecordDto updateServiceRecord(Long id, ServiceRecordDto dto);

    void deleteServiceRecord(Long id);

    List<ServiceRecordDto> filterServiceRecords(ServiceFilterRequest filter);

    List<ServiceRecordDto> getServiceRecordsByVehicle(String vehicleRegNumber);

    net.javaguids.ems_backend.dto.ServiceRecordStatsDto getServiceStats();

    List<ServiceRecordDto> getUpcomingServices();

    List<ServiceRecordDto> getRecentServices();

    /** Saves a bill attachment file for the given service record */
    ServiceRecordDto uploadAttachment(Long id, MultipartFile file);

    /** Returns all soft-deleted service records (for the recycle-bin view) */
    List<ServiceRecordDto> getDeletedServiceRecords();

    /** Restores a soft-deleted service record back to active state */
    ServiceRecordDto restoreServiceRecord(Long id);

    /** Returns the full edit history (audit trail) for a specific service record */
    List<net.javaguids.ems_backend.dto.ServiceRecordAuditDto> getServiceHistory(Long id);
}
