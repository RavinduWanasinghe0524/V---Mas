package net.javaguids.ems_backend.service;

import net.javaguids.ems_backend.dto.VehicleDto;
import org.apache.coyote.BadRequestException;

import java.util.List;

public interface VehicleService {

    VehicleDto createVehicle(VehicleDto vehicleDto);

    VehicleDto getVehicleById(Long id);

    List<VehicleDto> getAllVehicles();

    VehicleDto updateVehicle(Long id, VehicleDto vehicleDto, String updatedBy);

    void deleteVehicle(Long id);

    VehicleDto getAssignedVehicle(String username);

    VehicleDto assignDriver(Long vehicleId, Long driverId) throws BadRequestException;
}
