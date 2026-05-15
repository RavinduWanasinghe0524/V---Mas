package net.javaguids.ems_backend.service.impl;

import jakarta.persistence.criteria.Predicate;
import lombok.AllArgsConstructor;
import net.javaguids.ems_backend.dto.ServiceFilterRequest;
import net.javaguids.ems_backend.dto.ServiceRecordDto;
import net.javaguids.ems_backend.entity.ServiceRecord;
import net.javaguids.ems_backend.enums.ServiceType;
import net.javaguids.ems_backend.exception.ResourceNotFoundException;
import net.javaguids.ems_backend.mapper.ServiceRecordMapper;
import net.javaguids.ems_backend.repository.ServiceRecordRepository;
import net.javaguids.ems_backend.service.ServiceRecordService;
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
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class ServiceRecordServiceImpl implements ServiceRecordService {

    private final ServiceRecordRepository serviceRecordRepository;
    private final NotificationService notificationService;

    @Override
    public ServiceRecordDto createServiceRecord(ServiceRecordDto dto) {
        validateServiceTypeDetail(dto.getServiceType(), dto.getServiceTypeDetail());

        ServiceRecord record = ServiceRecordMapper.mapToServiceRecord(dto);

        // Auto-set the creator from the currently authenticated user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            record.setCreatedBy(auth.getName());
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
        return serviceRecordRepository.findAll()
                .stream()
                .map(ServiceRecordMapper::mapToServiceRecordDto)
                .collect(Collectors.toList());
    }

    @Override
    public ServiceRecordDto updateServiceRecord(Long id, ServiceRecordDto dto) {
        ServiceRecord record = serviceRecordRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service record not found with id: " + id));

        validateServiceTypeDetail(dto.getServiceType(), dto.getServiceTypeDetail());

        record.setVehicleRegNumber(dto.getVehicleRegNumber());
        record.setServiceType(dto.getServiceType());
        record.setServiceTypeDetail(dto.getServiceTypeDetail());
        record.setServiceDate(dto.getServiceDate());
        record.setCurrentMileageKm(dto.getCurrentMileageKm());
        record.setServiceCost(dto.getServiceCost());
        record.setTechnicianWorkshop(dto.getTechnicianWorkshop());
        record.setNextServiceDue(dto.getNextServiceDue());
        record.setDescription(dto.getDescription());

        ServiceRecord updated = serviceRecordRepository.save(record);
        
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
        serviceRecordRepository.delete(java.util.Objects.requireNonNull(record));
    }

    @Override
    public List<ServiceRecordDto> filterServiceRecords(ServiceFilterRequest filter) {
        Specification<ServiceRecord> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

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
        return serviceRecordRepository.findByVehicleRegNumber(vehicleRegNumber)
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
        return serviceRecordRepository.findByNextServiceDueBetweenOrderByNextServiceDueAsc(today, thirtyDaysFromNow)
                .stream()
                .map(ServiceRecordMapper::mapToServiceRecordDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ServiceRecordDto> getRecentServices() {
        return serviceRecordRepository.findTop5ByOrderByServiceDateDesc()
                .stream()
                .map(ServiceRecordMapper::mapToServiceRecordDto)
                .collect(Collectors.toList());
    }
}
