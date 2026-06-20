package net.javaguids.ems_backend.service;

import net.javaguids.ems_backend.dto.VehicleDto;
import java.util.List;

public interface VehicleService {

    VehicleDto createVehicle(VehicleDto vehicleDto);

    VehicleDto getVehicleById(Long id);

    List<VehicleDto> getAllVehicles();

    VehicleDto updateVehicle(Long id, VehicleDto vehicleDto, String updatedBy);

    void deleteVehicle(Long id);

    VehicleDto assignDriver(Long vehicleId, Long driverId);

    VehicleDto unassignDriver(Long vehicleId);

    VehicleDto uploadDocument(Long id, String docType, org.springframework.web.multipart.MultipartFile file, String expiryDateStr);

    org.springframework.core.io.Resource getDocument(Long id, String docType);

    List<VehicleDto> getDeletedVehicles();

    VehicleDto restoreVehicle(Long id);

    void updateBulkMileage(List<net.javaguids.ems_backend.dto.VehicleMileageUpdateDto> updates, String updatedBy);

}
