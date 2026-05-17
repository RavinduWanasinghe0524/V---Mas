package net.javaguids.ems_backend.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import lombok.AllArgsConstructor;
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
import net.javaguids.ems_backend.service.ServiceRecordService;
import org.springframework.security.access.AccessDeniedException;
import net.javaguids.ems_backend.service.NotificationService;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class ServiceRecordServiceImpl implements ServiceRecordService {

    private final ServiceRecordRepository serviceRecordRepository;
    private final ServiceRecordAuditRepository auditRepository;
    private final VehicleRepository vehicleRepository;
    private final NotificationService notificationService;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public ServiceRecordDto createServiceRecord(ServiceRecordDto dto) {
        validateServiceTypeDetail(dto.getServiceType(), dto.getServiceTypeDetail());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;

        // ── Driver ownership guard: vehicle reg must match the driver's assigned vehicle ──
        boolean isDriver = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_DRIVER"));
        if (isDriver) {
            Vehicle assignedVehicle = vehicleRepository.findByAssigneeUsername(currentUsername)
                    .orElseThrow(() -> new AccessDeniedException(
                            "No vehicle is assigned to you. You cannot add a service record."));
            if (!assignedVehicle.getRegistrationNo().equals(dto.getVehicleRegNumber())) {
                throw new AccessDeniedException(
                        "You can only add service records for your assigned vehicle: "
                                + assignedVehicle.getRegistrationNo());
            }
        }

        ServiceRecord record = ServiceRecordMapper.mapToServiceRecord(dto);

        // Auto-set the creator from the currently authenticated user
        if (currentUsername != null) {
            record.setCreatedBy(currentUsername);
        }

        ServiceRecord saved = serviceRecordRepository.save(java.util.Objects.requireNonNull(record));
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
        if (isDriver) {
            String currentUsername = auth.getName();
            if (!currentUsername.equals(record.getCreatedBy())) {
                throw new AccessDeniedException(
                        "You can only edit service records that you created.");
            }
            // Also ensure the vehicle reg number stays locked to their assigned vehicle
            Vehicle assignedVehicle = vehicleRepository.findByAssigneeUsername(currentUsername)
                    .orElseThrow(() -> new AccessDeniedException(
                            "No vehicle is assigned to you."));
            if (!assignedVehicle.getRegistrationNo().equals(dto.getVehicleRegNumber())) {
                throw new AccessDeniedException(
                        "You cannot change the vehicle registration number.");
            }
        }

        validateServiceTypeDetail(dto.getServiceType(), dto.getServiceTypeDetail());

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
        auditField(changes, "Service Cost (Rs.)",
                str(record.getServiceCost()), str(dto.getServiceCost()));
        auditField(changes, "Technician / Workshop",
                record.getTechnicianWorkshop(), dto.getTechnicianWorkshop());
        auditField(changes, "Next Service Due",
                str(record.getNextServiceDue()), str(dto.getNextServiceDue()));
        auditField(changes, "Next Service Mileage (km)",
                str(record.getNextServiceMileageKm()), str(dto.getNextServiceMileageKm()));
        auditField(changes, "Description",
                record.getDescription(), dto.getDescription());

        // Apply the updates to the record
        record.setVehicleRegNumber(dto.getVehicleRegNumber());
        record.setServiceType(dto.getServiceType());
        record.setServiceTypeDetail(dto.getServiceTypeDetail());
        record.setServiceDate(dto.getServiceDate());
        record.setCurrentMileageKm(dto.getCurrentMileageKm());
        record.setServiceCost(dto.getServiceCost());
        record.setTechnicianWorkshop(dto.getTechnicianWorkshop());
        record.setNextServiceDue(dto.getNextServiceDue());
        record.setNextServiceMileageKm(dto.getNextServiceMileageKm());
        record.setDescription(dto.getDescription());

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

        notificationService.createNotification(
                "VEH-" + updated.getVehicleRegNumber(),
                "Service record for vehicle " + updated.getVehicleRegNumber() + " was updated.",
                "SERVICE_UPDATE"
        );

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
     * Files are saved under uploads/service-attachments/{recordId}/{uuid}_{originalFilename}
     */
    @Override
    public ServiceRecordDto uploadAttachment(Long id, MultipartFile file) {
        ServiceRecord record = serviceRecordRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service record not found with id: " + id));

        try {
            // Build a stable directory per record
            String uploadDir = "uploads/service-attachments/" + id;
            Path uploadPath = Paths.get(uploadDir);
            Files.createDirectories(uploadPath);

            // Use a UUID prefix to avoid filename collisions
            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            record.setAttachmentPath(uploadDir + "/" + filename);
            ServiceRecord updated = serviceRecordRepository.save(record);
            return ServiceRecordMapper.mapToServiceRecordDto(updated);

        } catch (IOException e) {
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
                            .map(ServiceRecord::getServiceCost)
                            .filter(Objects::nonNull)
                            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
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

    /** Converts ServiceType enum to a human-readable label. */
    private String enumLabel(ServiceType type) {
        return type == null ? null : type.name().replace('_', ' ');
    }
}
