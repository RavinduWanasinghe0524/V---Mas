package net.javaguids.ems_backend.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Value;
import net.javaguids.ems_backend.dto.ServiceFilterRequest;
import net.javaguids.ems_backend.dto.ServiceRecordAuditDto;
import net.javaguids.ems_backend.dto.ServiceRecordDto;
import net.javaguids.ems_backend.entity.ServiceRecord;
import net.javaguids.ems_backend.entity.ServiceRecordAudit;
import net.javaguids.ems_backend.enums.ServiceType;
import net.javaguids.ems_backend.exception.ResourceNotFoundException;
import net.javaguids.ems_backend.entity.Vehicle;
import net.javaguids.ems_backend.mapper.ServiceRecordMapper;
import net.javaguids.ems_backend.repository.ServiceRecordAuditRepository;
import net.javaguids.ems_backend.repository.ServiceRecordRepository;
import net.javaguids.ems_backend.repository.VehicleRepository;
import net.javaguids.ems_backend.repository.ServiceIntervalRepository;
import net.javaguids.ems_backend.service.ServiceRecordService;
import org.springframework.security.access.AccessDeniedException;
import net.javaguids.ems_backend.service.NotificationService;
import net.javaguids.ems_backend.service.StorageService;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceRecordServiceImpl implements ServiceRecordService {

    private final ServiceRecordRepository serviceRecordRepository;
    private final ServiceRecordAuditRepository auditRepository;
    private final VehicleRepository vehicleRepository;
    private final NotificationService notificationService;
    private final ServiceIntervalRepository serviceIntervalRepository;
    private final StorageService storageService;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Value("${app.upload.dir:uploads/service-attachments}")
    private String uploadBaseDir;

    public ServiceRecordServiceImpl(ServiceRecordRepository serviceRecordRepository,
                                    ServiceRecordAuditRepository auditRepository,
                                    VehicleRepository vehicleRepository,
                                    NotificationService notificationService,
                                    ServiceIntervalRepository serviceIntervalRepository,
                                    StorageService storageService) {
        this.serviceRecordRepository = serviceRecordRepository;
        this.auditRepository = auditRepository;
        this.vehicleRepository = vehicleRepository;
        this.notificationService = notificationService;
        this.serviceIntervalRepository = serviceIntervalRepository;
        this.storageService = storageService;
    }

    @Override
    public ServiceRecordDto createServiceRecord(ServiceRecordDto dto) {
        validateServiceTypeDetail(dto.getServiceType(), dto.getServiceTypeDetail());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;

        // Driver can add service records for any vehicle (no assignment check required)

        // ── Ensure vehicle exists and update its mileage ──
        Vehicle vehicle = vehicleRepository.findByRegistrationNo(dto.getVehicleRegNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle with registration number '" + dto.getVehicleRegNumber() + "' not found."));

        if (dto.getCurrentMileageKm() != null) {
            try {
                Integer dtoMil = dto.getCurrentMileageKm();
                Integer vehicleMil = vehicle.getCurrentMileageKm() != null ? vehicle.getCurrentMileageKm() : 0;
                if (dtoMil < vehicleMil) {
                    throw new RuntimeException("Current mileage cannot be less than the vehicle's last recorded mileage (" + vehicleMil + " km).");
                } else if (dtoMil > vehicleMil) {
                    vehicle.setCurrentMileageKm(dtoMil);
                    vehicleRepository.save(vehicle);
                }
            } catch (Exception ignored) {}
        }

        ServiceRecord record = ServiceRecordMapper.mapToServiceRecord(dto);

        if (record.getNextServiceMileageKm() == null) {
            serviceIntervalRepository.findByVehicleTypeAndServiceType(vehicle.getVehicleType(), record.getServiceType())
                .ifPresent(interval -> {
                    record.setNextServiceMileageKm(record.getCurrentMileageKm() + interval.getIntervalKm());
                });
        }

        // Auto-set the creator from the currently authenticated user
        if (currentUsername != null) {
            record.setCreatedBy(currentUsername);
        }

        ServiceRecord saved = serviceRecordRepository.save(java.util.Objects.requireNonNull(record));
        try {
            notificationService.resolveServiceAlerts(saved.getVehicleRegNumber(), saved.getServiceType().name());
        } catch (Exception e) {
            // non-blocking
        }
        return ServiceRecordMapper.mapToServiceRecordDto(saved);
    }

    @Override
    public ServiceRecordDto getServiceRecordById(Long id) {
        ServiceRecord record = serviceRecordRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service record not found with id: " + id));
        return ServiceRecordMapper.mapToServiceRecordDto(record);
    }

    @Override
    public List<ServiceRecordDto> getAllServiceRecords() {
        // Only return active (non-deleted) records
        return serviceRecordRepository.findAll()
                .stream()
                .filter(r -> !r.isDeleted())
                .map(ServiceRecordMapper::mapToServiceRecordDto)
                .collect(Collectors.toList());
    }

    @Override
    public ServiceRecordDto updateServiceRecord(Long id, ServiceRecordDto dto) {
        ServiceRecord record = serviceRecordRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service record not found with id: " + id));

        // ── Driver ownership guard: drivers may only edit records they personally created ──
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isDriver = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_DRIVER"));
        if (isDriver && auth != null) {
            String currentUsername = auth.getName();
            if (!currentUsername.equals(record.getCreatedBy())) {
                throw new AccessDeniedException(
                        "You can only edit service records that you created.");
            }
        }

        validateServiceTypeDetail(dto.getServiceType(), dto.getServiceTypeDetail());

        // ── Ensure vehicle exists and update its mileage ──
        Vehicle vehicle = vehicleRepository.findByRegistrationNo(dto.getVehicleRegNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle with registration number '" + dto.getVehicleRegNumber() + "' not found."));

        if (dto.getCurrentMileageKm() != null) {
            try {
                Integer dtoMil = dto.getCurrentMileageKm();
                Integer vehicleMil = vehicle.getCurrentMileageKm() != null ? vehicle.getCurrentMileageKm() : 0;
                
                if (dtoMil < vehicleMil) {
                    throw new RuntimeException("Current mileage cannot be less than the vehicle's last recorded mileage (" + vehicleMil + " km).");
                } else if (dtoMil > vehicleMil) {
                    vehicle.setCurrentMileageKm(dtoMil);
                    vehicleRepository.save(vehicle);
                }
            } catch (Exception ignored) {}
        }

        // ── Build field-level diff before applying changes ──────────────────────────────
        List<Map<String, String>> changes = new ArrayList<>();

        auditField(changes, "Vehicle Reg. No.",
                record.getVehicleRegNumber(), dto.getVehicleRegNumber());
        auditField(changes, "Service Type",
                enumLabel(record.getServiceType()), enumLabel(dto.getServiceType()));
        auditField(changes, "Service Type Detail",
                record.getServiceTypeDetail(), dto.getServiceTypeDetail());
        auditField(changes, "Service Date",
                str(record.getServiceDate()), str(dto.getServiceDate()));
        auditField(changes, "Mileage (km)",
                str(record.getCurrentMileageKm()), str(dto.getCurrentMileageKm()));
        java.math.BigDecimal oldCost = record.getServiceCost();
        java.math.BigDecimal newCost = dto.getServiceCost();
        if ((oldCost == null && newCost != null) || 
            (oldCost != null && newCost == null) || 
            (oldCost != null && newCost != null && oldCost.compareTo(newCost) != 0)) {
            Map<String, String> costEntry = new LinkedHashMap<>();
            costEntry.put("field", "Service Cost (Rs.)");
            costEntry.put("from", oldCost == null ? "—" : oldCost.stripTrailingZeros().toPlainString());
            costEntry.put("to",   newCost == null ? "—" : newCost.stripTrailingZeros().toPlainString());
            changes.add(costEntry);
        }
        auditField(changes, "Technician / Workshop",
                record.getTechnicianWorkshop(), dto.getTechnicianWorkshop());
        auditField(changes, "Next Service Due",
                str(record.getNextServiceDue()), str(dto.getNextServiceDue()));
        auditField(changes, "Next Service Mileage (km)",
                str(record.getNextServiceMileageKm()), str(dto.getNextServiceMileageKm()));
        auditField(changes, "Description",
                record.getDescription(), dto.getDescription());
        auditField(changes, "Parts Replaced",
                record.getPartsReplaced(), dto.getPartsReplaced());
        auditField(changes, "Service Classification",
                record.getServiceClassification(), dto.getServiceClassification());

        // Apply the updates to the record
        record.setVehicleRegNumber(dto.getVehicleRegNumber());
        record.setServiceType(dto.getServiceType());
        record.setServiceTypeDetail(dto.getServiceTypeDetail());
        record.setServiceDate(dto.getServiceDate());
        record.setCurrentMileageKm(dto.getCurrentMileageKm());
        record.setServiceCost(dto.getServiceCost());
        record.setTechnicianWorkshop(dto.getTechnicianWorkshop());
        record.setNextServiceDue(dto.getNextServiceDue());
        if (dto.getNextServiceMileageKm() != null) {
            record.setNextServiceMileageKm(dto.getNextServiceMileageKm());
        } else {
            serviceIntervalRepository.findByVehicleTypeAndServiceType(vehicle.getVehicleType(), record.getServiceType())
                .ifPresent(interval -> {
                    record.setNextServiceMileageKm(record.getCurrentMileageKm() + interval.getIntervalKm());
                });
        }
        record.setDescription(dto.getDescription());
        record.setPartsReplaced(dto.getPartsReplaced());
        if (dto.getServiceClassification() != null) {
            record.setServiceClassification(dto.getServiceClassification());
        }

        ServiceRecord updated = serviceRecordRepository.save(record);

        // ── Persist audit entry if anything actually changed ──────────────────────────────
        if (!changes.isEmpty()) {
            String editor = (auth != null && auth.isAuthenticated()) ? auth.getName() : "unknown";
            try {
                ServiceRecordAudit audit = new ServiceRecordAudit();
                audit.setServiceRecordId(id);
                audit.setChangedBy(editor);
                audit.setChangedAt(java.time.LocalDateTime.now());
                audit.setChangedFields(OBJECT_MAPPER.writeValueAsString(changes));
                auditRepository.save(audit);
            } catch (JsonProcessingException e) {
                // Non-fatal: log but do not fail the update
                System.err.println("[ServiceRecord] Failed to serialize audit fields: " + e.getMessage());
            }
        }

        // Create a detailed notification message containing only the changed fields with values
        StringBuilder msgBuilder = new StringBuilder("Service record for vehicle ")
                .append(updated.getVehicleRegNumber())
                .append(" was updated.");
        
        if (!changes.isEmpty()) {
            msgBuilder.append(" Changes: ");
            for (int i = 0; i < changes.size(); i++) {
                Map<String, String> change = changes.get(i);
                if (i > 0) msgBuilder.append(", ");
                msgBuilder.append(change.get("field"))
                          .append(" (")
                          .append(change.get("from"))
                          .append(" → ")
                          .append(change.get("to"))
                          .append(")");
            }
        }

        notificationService.createNotification(
                "VEH-" + updated.getVehicleRegNumber(),
                msgBuilder.toString(),
                "SERVICE_UPDATE"
        );

        try {
            notificationService.resolveServiceAlerts(updated.getVehicleRegNumber(), updated.getServiceType().name());
        } catch (Exception e) {
            // non-blocking
        }

        return ServiceRecordMapper.mapToServiceRecordDto(updated);
    }

    @Override
    public void deleteServiceRecord(Long id) {
        ServiceRecord record = serviceRecordRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service record not found with id: " + id));

        // Soft-delete: mark the record as deleted, capture who and when
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        record.setDeleted(true);
        record.setDeletedBy(auth != null && auth.isAuthenticated() ? auth.getName() : "unknown");
        record.setDeletedAt(java.time.LocalDateTime.now());
        serviceRecordRepository.save(record);
    }

    @Override
    public List<ServiceRecordDto> filterServiceRecords(ServiceFilterRequest filter) {
        Specification<ServiceRecord> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Always exclude soft-deleted records from filter results
            predicates.add(cb.equal(root.get("deleted"), false));

            if (filter.getVehicleRegNumber() != null) {
                predicates.add(cb.equal(root.get("vehicleRegNumber"), filter.getVehicleRegNumber()));
            }
            if (filter.getServiceType() != null) {
                predicates.add(cb.equal(root.get("serviceType"), filter.getServiceType()));
            }
            if (filter.getFromDate() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("serviceDate"), filter.getFromDate()));
            }
            if (filter.getToDate() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("serviceDate"), filter.getToDate()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return serviceRecordRepository.findAll(spec)
                .stream()
                .map(ServiceRecordMapper::mapToServiceRecordDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ServiceRecordDto> getServiceRecordsByVehicle(String vehicleRegNumber) {
        return serviceRecordRepository.findByVehicleRegNumberAndDeletedFalse(vehicleRegNumber)
                .stream()
                .map(ServiceRecordMapper::mapToServiceRecordDto)
                .collect(Collectors.toList());
    }

    /**
     * Validates that serviceTypeDetail is provided when serviceType is OTHER.
     */
    private void validateServiceTypeDetail(ServiceType serviceType, String serviceTypeDetail) {
        if (ServiceType.OTHER.equals(serviceType)
                && (serviceTypeDetail == null || serviceTypeDetail.isBlank())) {
            throw new RuntimeException(
                    "Service type detail is required when service type is 'OTHER'.");
        }
    }

    /**
     * Stores the uploaded bill attachment file to disk and persists the path on the record.
     * Files are saved under {app.upload.dir}/{recordId}/{uuid}_{originalFilename}
     * The base directory is configured via app.upload.dir in application.properties.
     */
    private String getCleanFilename(String path) {
        if (path == null || path.isBlank()) {
            return null;
        }
        String filename = path.substring(path.lastIndexOf('/') + 1);
        int firstUnderscore = filename.indexOf('_');
        if (firstUnderscore > 0 && firstUnderscore < 40) {
            return filename.substring(firstUnderscore + 1);
        }
        return filename;
    }



    @Override
    public ServiceRecordDto uploadAttachment(Long id, MultipartFile file) {
        ServiceRecord record = serviceRecordRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service record not found with id: " + id));

        try {
            String uploadDir = uploadBaseDir + "/" + id;
            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
            String savedPath = storageService.storeFile(uploadDir, filename, file);

            String oldPath = record.getAttachmentPath();
            if (oldPath != null && !oldPath.isBlank()) {
                storageService.deleteFile(oldPath);
            }
            String oldFilename = getCleanFilename(oldPath);
            String newFilename = file.getOriginalFilename();

            record.setAttachmentPath(savedPath);
            ServiceRecord updated = serviceRecordRepository.save(record);

            // ── Persist audit entry for the attachment upload ──────────────────────────
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String editor = (auth != null && auth.isAuthenticated()) ? auth.getName() : "unknown";

            List<Map<String, String>> changes = new ArrayList<>();
            Map<String, String> changeEntry = new LinkedHashMap<>();
            changeEntry.put("field", "Bill Attachment");
            changeEntry.put("from", oldFilename == null ? "—" : oldFilename);
            changeEntry.put("to",   newFilename);
            changes.add(changeEntry);

            try {
                ServiceRecordAudit audit = new ServiceRecordAudit();
                audit.setServiceRecordId(id);
                audit.setChangedBy(editor);
                audit.setChangedAt(java.time.LocalDateTime.now());
                audit.setChangedFields(OBJECT_MAPPER.writeValueAsString(changes));
                auditRepository.save(audit);
            } catch (JsonProcessingException e) {
                System.err.println("[ServiceRecord] Failed to serialize attachment audit: " + e.getMessage());
            }

            // ── Dispatch Notification ──
            notificationService.createNotification(
                    "VEH-" + updated.getVehicleRegNumber(),
                    "Bill attachment was " + (oldFilename == null ? "added" : "updated") + " for vehicle " + updated.getVehicleRegNumber() + ". Filename: " + newFilename,
                    "SERVICE_UPDATE"
            );

            return ServiceRecordMapper.mapToServiceRecordDto(updated);

        } catch (Exception e) {
            throw new RuntimeException("Failed to store attachment: " + e.getMessage(), e);
        }
    }

    @Override
    public net.javaguids.ems_backend.dto.ServiceRecordStatsDto getServiceStats() {
        Long totalRecords = serviceRecordRepository.count();
        java.math.BigDecimal totalCost = serviceRecordRepository.getTotalServiceCost();
        if (totalCost == null) {
            totalCost = java.math.BigDecimal.ZERO;
        }

        List<Object[]> typeCounts = serviceRecordRepository.countServicesByType();
        java.util.Map<String, Long> servicesByType = new java.util.HashMap<>();
        for (Object[] row : typeCounts) {
            if (row[0] != null) {
                ServiceType type = (ServiceType) row[0];
                Long count = (Long) row[1];
                servicesByType.put(type.name(), count);
            }
        }

        return new net.javaguids.ems_backend.dto.ServiceRecordStatsDto(totalRecords, totalCost, servicesByType);
    }

    @Override
    public List<ServiceRecordDto> getUpcomingServices() {
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate thirtyDaysFromNow = today.plusDays(30);
        return serviceRecordRepository.findByNextServiceDueBetweenAndDeletedFalseOrderByNextServiceDueAsc(today, thirtyDaysFromNow)
                .stream()
                .map(ServiceRecordMapper::mapToServiceRecordDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ServiceRecordDto> getRecentServices() {
        return serviceRecordRepository.findTop5ByDeletedFalseOrderByServiceDateDesc()
                .stream()
                .map(ServiceRecordMapper::mapToServiceRecordDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ServiceRecordDto> getDeletedServiceRecords() {
        return serviceRecordRepository.findAllDeleted()
                .stream()
                .map(ServiceRecordMapper::mapToServiceRecordDto)
                .collect(Collectors.toList());
    }

    @Override
    public ServiceRecordDto restoreServiceRecord(Long id) {
        ServiceRecord record = serviceRecordRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service record not found with id: " + id));

        if (!record.isDeleted()) {
            throw new RuntimeException("Service record with id " + id + " is not deleted.");
        }

        // Clear soft-delete fields to restore the record
        record.setDeleted(false);
        record.setDeletedBy(null);
        record.setDeletedAt(null);

        ServiceRecord restored = serviceRecordRepository.save(record);
        return ServiceRecordMapper.mapToServiceRecordDto(restored);
    }

    // ── Driver-scoped implementations ────────────────────────────────────────────

    @Override
    public List<ServiceRecordDto> getServiceRecordsForDriver(String driverUsername) {
        return vehicleRepository.findByAssigneeUsername(driverUsername)
                .map(vehicle -> serviceRecordRepository
                        .findByVehicleRegNumberAndDeletedFalse(vehicle.getRegistrationNo())
                        .stream()
                        .map(ServiceRecordMapper::mapToServiceRecordDto)
                        .collect(Collectors.toList()))
                .orElse(java.util.Collections.emptyList());
    }

    @Override
    public net.javaguids.ems_backend.dto.ServiceRecordStatsDto getServiceStatsForDriver(String driverUsername) {
        return vehicleRepository.findByAssigneeUsername(driverUsername)
                .map(vehicle -> {
                    List<ServiceRecord> records = serviceRecordRepository
                            .findByVehicleRegNumberAndDeletedFalse(vehicle.getRegistrationNo());
                    long totalRecords = records.size();
                    java.math.BigDecimal totalCost = records.stream()
                            .map(r -> r.getServiceCost())
                            .filter(cost -> cost != null)
                            .reduce(java.math.BigDecimal.ZERO, (a, b) -> a.add(b));
                    java.util.Map<String, Long> byType = records.stream()
                            .filter(r -> r.getServiceType() != null)
                            .collect(Collectors.groupingBy(
                                    r -> r.getServiceType().name(), Collectors.counting()));
                    return new net.javaguids.ems_backend.dto.ServiceRecordStatsDto(totalRecords, totalCost, byType);
                })
                .orElse(new net.javaguids.ems_backend.dto.ServiceRecordStatsDto(
                        0L, java.math.BigDecimal.ZERO, java.util.Collections.emptyMap()));
    }

    @Override
    public List<ServiceRecordAuditDto> getServiceHistory(Long id) {
        return auditRepository.findByServiceRecordIdOrderByChangedAtDesc(id)
                .stream()
                .map(a -> new ServiceRecordAuditDto(
                        a.getId(),
                        a.getServiceRecordId(),
                        a.getChangedBy(),
                        a.getChangedAt(),
                        a.getChangedFields()
                ))
                .collect(Collectors.toList());
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    /**
     * Compares old and new values; if different, adds a change map to the list.
     */
    private void auditField(List<Map<String, String>> changes, String fieldName,
                            String oldVal, String newVal) {
        String o = oldVal == null ? "" : oldVal.trim();
        String n = newVal == null ? "" : newVal.trim();
        if (!Objects.equals(o, n)) {
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("field", fieldName);
            entry.put("from", o.isEmpty() ? "—" : o);
            entry.put("to",   n.isEmpty() ? "—" : n);
            changes.add(entry);
        }
    }

    /** Null-safe toString for any value. */
    private String str(Object val) {
        return val == null ? null : val.toString();
    }

    @Override
    public org.springframework.core.io.Resource getAttachment(Long id) {
        ServiceRecord record = serviceRecordRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Service record not found with id: " + id));

        String attachmentPath = record.getAttachmentPath();
        if (attachmentPath == null || attachmentPath.isBlank()) {
            throw new ResourceNotFoundException("No attachment found for service record with id: " + id);
        }

        return storageService.loadFile(attachmentPath);
    }

    /** Converts ServiceType enum to a human-readable label. */
    private String enumLabel(ServiceType type) {
        return type == null ? null : type.name().replace('_', ' ');
    }
}
