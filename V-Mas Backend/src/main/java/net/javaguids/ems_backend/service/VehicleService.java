package net.javaguids.ems_backend.service;

import net.javaguids.ems_backend.dto.VehicleDto;
import java.util.List;

public interface VehicleService {

    VehicleDto createVehicle(VehicleDto vehicleDto);

    VehicleDto getVehicleById(Long id);

    List<VehicleDto> getAllVehicles();

    VehicleDto updateVehicle(Long id, VehicleDto vehicleDto, String updatedBy);

    void deleteVehicle(Long id);


    VehicleDto uploadDocument(Long id, String docType, org.springframework.web.multipart.MultipartFile file, String expiryDateStr);

    org.springframework.core.io.Resource getDocument(Long id, String docType);

    List<VehicleDto> getDeletedVehicles();

    VehicleDto restoreVehicle(Long id);

    void updateBulkMileage(List<net.javaguids.ems_backend.dto.VehicleMileageUpdateDto> updates, String updatedBy);

    /** Assign or unassign a driver to a vehicle. Pass null driverUsername to unassign. */
    VehicleDto assignDriver(Long vehicleId, String driverUsername);

    /** Fetch the vehicle that is assigned to the given driver username. */
    VehicleDto getMyVehicle(String driverUsername);

    /** Find a non-deleted vehicle by its registration number. Throws ResourceNotFoundException if not found. */
    VehicleDto getVehicleByRegistrationNo(String registrationNo);

}