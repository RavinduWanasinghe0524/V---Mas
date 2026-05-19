package net.javaguids.ems_backend.service.impl;

import lombok.AllArgsConstructor;
import net.javaguids.ems_backend.dto.VehicleDto;
import net.javaguids.ems_backend.entity.User;
import net.javaguids.ems_backend.entity.Vehicle;
import net.javaguids.ems_backend.enums.Role;
import net.javaguids.ems_backend.exception.ResourceNotFoundException;
import net.javaguids.ems_backend.mapper.VehicleMapper;
import net.javaguids.ems_backend.repository.UserRepository;
import net.javaguids.ems_backend.repository.VehicleRepository;
import net.javaguids.ems_backend.service.VehicleService;
import net.javaguids.ems_backend.service.NotificationService;
import org.apache.coyote.BadRequestException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
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
                .map(VehicleMapper::mapToVehicleDto)
                .collect(Collectors.toList());
    }

    @Override
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
        vehicle.setCurrentMileageKm(vehicleDto.getCurrentMileageKm());
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
    public void deleteVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));
        vehicleRepository.delete(vehicle);
    }
}
