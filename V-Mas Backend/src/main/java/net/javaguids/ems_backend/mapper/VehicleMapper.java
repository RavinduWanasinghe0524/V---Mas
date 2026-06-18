package net.javaguids.ems_backend.mapper;

import net.javaguids.ems_backend.dto.VehicleDto;
import net.javaguids.ems_backend.entity.Vehicle;

public class VehicleMapper {

    public static VehicleDto mapToVehicleDto(Vehicle vehicle) {

        return new VehicleDto(
                vehicle.getId(),
//                vehicle.getVehicleName(),
                vehicle.getRegistrationNo(),
                vehicle.getChassisNo(),
                vehicle.getEngineNo(),
                vehicle.getManufacturer(),
                vehicle.getModel(),
                vehicle.getYear(),
                vehicle.getCurrentMileageKm(),
                vehicle.getCreatedAt(),
                vehicle.getUpdatedAt(),
                vehicle.getUpdatedBy(),

                vehicle.getStatus(),
                vehicle.getFuelType(),
                vehicle.getVehicleType(),
                vehicle.getInsuranceExpiryDate(),
                vehicle.getLicenseExpiryDate(),
                vehicle.getDriver() != null ? vehicle.getDriver().getId() : null,
                vehicle.getDriver() != null ? vehicle.getDriver().getUserName() : null,
                vehicle.getInsuranceDocumentPath(),
                vehicle.getLicenseDocumentPath(),
                vehicle.getRegistrationBookPath(),
                vehicle.isDeleted(),
                vehicle.getDeletedBy(),
                vehicle.getDeletedAt()
        );
    }

    public static Vehicle mapToVehicle(VehicleDto dto) {
        Vehicle vehicle = new Vehicle();
        // vehicle_name column is NOT NULL — derive it from manufacturer + model
        String name = ((dto.getManufacturer() != null ? dto.getManufacturer() : "") + " "
                     + (dto.getModel() != null ? dto.getModel() : "")).trim();
        vehicle.setVehicleName(name.isEmpty() ? "Unknown" : name);
        vehicle.setRegistrationNo(dto.getRegistrationNo());
        vehicle.setManufacturer(dto.getManufacturer());
        vehicle.setModel(dto.getModel());
        vehicle.setYear(dto.getYear());
        vehicle.setCurrentMileageKm(dto.getCurrentMileageKm());
        vehicle.setChassisNo(dto.getChassisNumber());
        vehicle.setEngineNo(dto.getEngineNumber());
        vehicle.setStatus(dto.getStatus());
        vehicle.setFuelType(dto.getFuelType());
        vehicle.setVehicleType(dto.getVehicleType() != null ? dto.getVehicleType() : net.javaguids.ems_backend.enums.VehicleType.CAR);
        vehicle.setInsuranceExpiryDate(dto.getInsuranceExpiryDate());
        vehicle.setLicenseExpiryDate(dto.getLicenseExpiryDate());
        vehicle.setInsuranceDocumentPath(dto.getInsuranceDocumentPath());
        vehicle.setLicenseDocumentPath(dto.getLicenseDocumentPath());
        vehicle.setRegistrationBookPath(dto.getRegistrationBookPath());
        vehicle.setDeleted(dto.isDeleted());
        vehicle.setDeletedBy(dto.getDeletedBy());
        vehicle.setDeletedAt(dto.getDeletedAt());
        return vehicle;
    }
}
