package net.javaguids.ems_backend.service.impl;

import lombok.AllArgsConstructor;
import net.javaguids.ems_backend.dto.VehicleDto;
import net.javaguids.ems_backend.dto.VehicleMileageUpdateDto;
import net.javaguids.ems_backend.entity.Vehicle;
import net.javaguids.ems_backend.entity.ServiceRecord;
import net.javaguids.ems_backend.exception.ResourceNotFoundException;
import net.javaguids.ems_backend.mapper.VehicleMapper;
import net.javaguids.ems_backend.repository.VehicleRepository;
import net.javaguids.ems_backend.repository.ServiceIntervalRepository;
import net.javaguids.ems_backend.repository.ServiceRecordRepository;
import net.javaguids.ems_backend.service.VehicleService;
import net.javaguids.ems_backend.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepository;
    private final NotificationService notificationService;
    private final ServiceIntervalRepository serviceIntervalRepository;
    private final ServiceRecordRepository serviceRecordRepository;


    @Override
    @Transactional
    public VehicleDto createVehicle(VehicleDto vehicleDto) {
        if (vehicleRepository.existsByRegistrationNo(vehicleDto.getRegistrationNo())) {
            throw new RuntimeException("Vehicle with registration number '" + vehicleDto.getRegistrationNo() + "' already exists.");
        }
        Vehicle vehicle = VehicleMapper.mapToVehicle(vehicleDto);
        
        Vehicle saved = vehicleRepository.save(java.util.Objects.requireNonNull(vehicle));
        return VehicleMapper.mapToVehicleDto(saved);
    }

    @Override
    public VehicleDto getVehicleById(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));
        return VehicleMapper.mapToVehicleDto(vehicle);
    }

    @Override
    public List<VehicleDto> getAllVehicles() {
        return vehicleRepository.findAll().stream()
                .filter(v -> !v.isDeleted())
                .map(VehicleMapper::mapToVehicleDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public VehicleDto updateVehicle(Long id, VehicleDto vehicleDto, String updatedBy) {
        Vehicle vehicle = vehicleRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));

        if (!vehicle.getRegistrationNo().equals(vehicleDto.getRegistrationNo()) && vehicleRepository.existsByRegistrationNo(vehicleDto.getRegistrationNo())) {
            throw new RuntimeException("Vehicle with registration number '" + vehicleDto.getRegistrationNo() + "' already exists.");
        }

        // Update vehicleName to keep it in sync with manufacturer + model
        String name = ((vehicleDto.getManufacturer() != null ? vehicleDto.getManufacturer() : "") + " "
                     + (vehicleDto.getModel() != null ? vehicleDto.getModel() : "")).trim();
        vehicle.setVehicleName(name.isEmpty() ? vehicle.getVehicleName() : name);

        vehicle.setRegistrationNo(vehicleDto.getRegistrationNo());
        vehicle.setManufacturer(vehicleDto.getManufacturer());
        vehicle.setModel(vehicleDto.getModel());
        vehicle.setYear(vehicleDto.getYear());
        if (vehicleDto.getFuelType() != null) vehicle.setFuelType(vehicleDto.getFuelType());
        if (vehicleDto.getVehicleType() != null) vehicle.setVehicleType(vehicleDto.getVehicleType());
        if (vehicleDto.getCurrentMileageKm() != null) {
            // Find all active completed service records to enforce a minimum boundary
            List<ServiceRecord> records = serviceRecordRepository.findByVehicleRegNumberAndDeletedFalse(vehicle.getRegistrationNo());
            int maxCompletedServiceMileage = records.stream()
                    .filter(r -> r.getServiceDate() != null && !r.getServiceDate().isAfter(java.time.LocalDate.now()))
                    .mapToInt(ServiceRecord::getCurrentMileageKm)
                    .max()
                    .orElse(0);

            int initialMileage = vehicle.getInitialMileageKm() != null ? vehicle.getInitialMileageKm() : 0;
            int lowerLimit = Math.max(initialMileage, maxCompletedServiceMileage);

            if (vehicleDto.getCurrentMileageKm() < lowerLimit) {
                throw new RuntimeException("Updated mileage for vehicle " + vehicle.getRegistrationNo() + 
                        " cannot be less than the minimum required limit (" + lowerLimit + " km, based on initial mileage or completed service history).");
            }
            vehicle.setCurrentMileageKm(vehicleDto.getCurrentMileageKm());
        }
        vehicle.setChassisNo(vehicleDto.getChassisNumber());
        vehicle.setEngineNo(vehicleDto.getEngineNumber());
        
        // Expiry dates
        vehicle.setInsuranceExpiryDate(vehicleDto.getInsuranceExpiryDate());
        vehicle.setLicenseExpiryDate(vehicleDto.getLicenseExpiryDate());
        
        // Preserve or update document paths
        if (vehicleDto.getInsuranceDocumentPath() != null) vehicle.setInsuranceDocumentPath(vehicleDto.getInsuranceDocumentPath());
        if (vehicleDto.getLicenseDocumentPath() != null) vehicle.setLicenseDocumentPath(vehicleDto.getLicenseDocumentPath());
        if (vehicleDto.getRegistrationBookPath() != null) vehicle.setRegistrationBookPath(vehicleDto.getRegistrationBookPath());
        if (vehicleDto.getVehicleImage() != null) vehicle.setVehicleImage(vehicleDto.getVehicleImage());
        
        // Status update
        if (vehicleDto.getStatus() != null) {
            vehicle.setStatus(vehicleDto.getStatus());
        }

        vehicle.setUpdatedBy(updatedBy);
        vehicle.setUpdatedAt(LocalDateTime.now());

        Vehicle updated = vehicleRepository.save(vehicle);
        
        notificationService.createNotification(
                "VEH-" + updated.getRegistrationNo(),
                "Vehicle " + updated.getRegistrationNo() + " was updated by " + updatedBy,
                "UPDATE"
        );
        
        return VehicleMapper.mapToVehicleDto(updated);
    }

    @Override
    @Transactional
    public void deleteVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        vehicle.setDeleted(true);
        vehicle.setDeletedBy(auth != null && auth.isAuthenticated() ? auth.getName() : "unknown");
        vehicle.setDeletedAt(LocalDateTime.now());
        vehicleRepository.save(vehicle);
    }

    @Override
    @Transactional
    public VehicleDto uploadDocument(Long id, String docType, MultipartFile file, String expiryDateStr) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));

        try {
            // Target folder: uploads/vehicle-documents/{id}
            String uploadDir = "uploads/vehicle-documents/" + id;
            Path uploadPath = Paths.get(uploadDir);
            Files.createDirectories(uploadPath);

            // Save filename using UUID prefix
            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String savedPath = uploadDir + "/" + filename;

            // Set document path based on type
            if ("insurance".equalsIgnoreCase(docType)) {
                vehicle.setInsuranceDocumentPath(savedPath);
                if (expiryDateStr != null && !expiryDateStr.isEmpty()) {
                    vehicle.setInsuranceExpiryDate(java.time.LocalDate.parse(expiryDateStr));
                }
            } else if ("license".equalsIgnoreCase(docType)) {
                vehicle.setLicenseDocumentPath(savedPath);
                if (expiryDateStr != null && !expiryDateStr.isEmpty()) {
                    vehicle.setLicenseExpiryDate(java.time.LocalDate.parse(expiryDateStr));
                }
            } else if ("registration".equalsIgnoreCase(docType)) {
                vehicle.setRegistrationBookPath(savedPath);
            } else {
                throw new RuntimeException("Invalid document type: " + docType);
            }

            Vehicle saved = vehicleRepository.save(vehicle);

            notificationService.createNotification(
                    "VEH-" + saved.getRegistrationNo(),
                    "Vehicle document '" + docType + "' was updated for " + saved.getRegistrationNo() + ". Filename: " + file.getOriginalFilename(),
                    "UPDATE"
            );

            return VehicleMapper.mapToVehicleDto(saved);

        } catch (IOException e) {
            throw new RuntimeException("Failed to store vehicle document: " + e.getMessage(), e);
        }
    }

    @Override
    public org.springframework.core.io.Resource getDocument(Long id, String docType) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));

        String savedPath;
        if ("insurance".equalsIgnoreCase(docType)) {
            savedPath = vehicle.getInsuranceDocumentPath();
        } else if ("license".equalsIgnoreCase(docType)) {
            savedPath = vehicle.getLicenseDocumentPath();
        } else if ("registration".equalsIgnoreCase(docType)) {
            savedPath = vehicle.getRegistrationBookPath();
        } else {
            throw new RuntimeException("Invalid document type: " + docType);
        }

        if (savedPath == null || savedPath.isBlank()) {
            throw new ResourceNotFoundException("No " + docType + " document found for vehicle with id: " + id);
        }

        try {
            Path filePath = Paths.get(savedPath);
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Document file not found or not readable at: " + savedPath);
            }
        } catch (java.net.MalformedURLException e) {
            throw new RuntimeException("Error reading document file path: " + e.getMessage(), e);
        }
    }

    @Override
    public List<VehicleDto> getDeletedVehicles() {
        return vehicleRepository.findAll().stream()
                .filter(Vehicle::isDeleted)
                .map(VehicleMapper::mapToVehicleDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public VehicleDto restoreVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));
        if (!vehicle.isDeleted()) {
            throw new RuntimeException("Vehicle is not deleted.");
        }
        vehicle.setDeleted(false);
        vehicle.setDeletedBy(null);
        vehicle.setDeletedAt(null);
        Vehicle restored = vehicleRepository.save(vehicle);
        return VehicleMapper.mapToVehicleDto(restored);
    }

    @Override
    @Transactional
    public void updateBulkMileage(List<VehicleMileageUpdateDto> updates, String updatedBy) {
        for (VehicleMileageUpdateDto update : updates) {
            Vehicle vehicle = vehicleRepository.findById(update.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + update.getId()));

            if (update.getCurrentMileageKm() != null) {
                // Find all active completed service records to enforce a minimum boundary
                List<ServiceRecord> records = serviceRecordRepository.findByVehicleRegNumberAndDeletedFalse(vehicle.getRegistrationNo());
                int maxCompletedServiceMileage = records.stream()
                        .filter(r -> r.getServiceDate() != null && !r.getServiceDate().isAfter(java.time.LocalDate.now()))
                        .mapToInt(ServiceRecord::getCurrentMileageKm)
                        .max()
                        .orElse(0);

                int initialMileage = vehicle.getInitialMileageKm() != null ? vehicle.getInitialMileageKm() : 0;
                int lowerLimit = Math.max(initialMileage, maxCompletedServiceMileage);

                if (update.getCurrentMileageKm() < lowerLimit) {
                    throw new RuntimeException("Updated mileage for vehicle " + vehicle.getRegistrationNo() + 
                            " cannot be less than the minimum required limit (" + lowerLimit + " km, based on initial mileage or completed service history).");
                }
                vehicle.setCurrentMileageKm(update.getCurrentMileageKm());
                vehicle.setUpdatedBy(updatedBy);
                vehicle.setUpdatedAt(LocalDateTime.now());
                vehicleRepository.save(vehicle);

                // Check service milestones
                checkServiceMilestones(vehicle);
            }
        }
    }

    private void checkServiceMilestones(Vehicle vehicle) {
        List<net.javaguids.ems_backend.entity.ServiceInterval> intervals =
                serviceIntervalRepository.findByVehicleType(vehicle.getVehicleType());

        for (net.javaguids.ems_backend.entity.ServiceInterval interval : intervals) {
            List<ServiceRecord> lastRecords = serviceRecordRepository
                    .findByVehicleRegNumberAndServiceTypeAndDeletedFalseOrderByCurrentMileageKmDesc(
                            vehicle.getRegistrationNo(), interval.getServiceType());

            int lastServiceMileage = 0;
            if (!lastRecords.isEmpty()) {
                lastServiceMileage = lastRecords.get(0).getCurrentMileageKm();
            } else {
                lastServiceMileage = vehicle.getInitialMileageKm() != null ? vehicle.getInitialMileageKm() : 0;
            }

            int nextDueMileage = lastServiceMileage + interval.getIntervalKm();
            int currentMileage = vehicle.getCurrentMileageKm();

            if (currentMileage >= nextDueMileage) {
                String message = String.format("Vehicle %s has exceeded its service milestone for %s. Current: %d km, Due: %d km (exceeded by %d km).",
                        vehicle.getRegistrationNo(), interval.getServiceType().name(), currentMileage, nextDueMileage, (currentMileage - nextDueMileage));
                notificationService.createNotification(
                        "SERVICE-" + vehicle.getRegistrationNo() + "-" + interval.getServiceType().name(),
                        message,
                        "ALERT"
                );
            } else if (currentMileage >= (nextDueMileage - 200)) {
                String message = String.format("Vehicle %s is approaching its service milestone for %s. Current: %d km, Due: %d km (%d km remaining).",
                        vehicle.getRegistrationNo(), interval.getServiceType().name(), currentMileage, nextDueMileage, (nextDueMileage - currentMileage));
                notificationService.createNotification(
                        "SERVICE-" + vehicle.getRegistrationNo() + "-" + interval.getServiceType().name(),
                        message,
                        "WARNING"
                );
            }
        }
    }
}
