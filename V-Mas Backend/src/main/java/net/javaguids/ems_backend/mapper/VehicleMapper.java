package net.javaguids.ems_backend.mapper;

import net.javaguids.ems_backend.dto.VehicleDto;
import net.javaguids.ems_backend.entity.User;
import net.javaguids.ems_backend.entity.Vehicle;

public class VehicleMapper {

    public static VehicleDto mapToVehicleDto(Vehicle vehicle) {

        return new VehicleDto(
                vehicle.getId(),
//                vehicle.getVehicleName(),
                vehicle.getRegistrationNo(),
                vehicle.getChassisNo(),
                vehicle.getManufacturer(),
                vehicle.getModel(),
                vehicle.getYear(),
                vehicle.getCurrentMileageKm(),
                vehicle.getCreatedAt(),
                vehicle.getUpdatedAt(),
                vehicle.getUpdatedBy(),

                vehicle.getStatus(),
                vehicle.getFuelType(),
                vehicle.getInsuranceExpiryDate(),
                vehicle.getLicenseExpiryDate()
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
        vehicle.setStatus(dto.getStatus());
        vehicle.setFuelType(dto.getFuelType());
        vehicle.setInsuranceExpiryDate(dto.getInsuranceExpiryDate());
        vehicle.setLicenseExpiryDate(dto.getLicenseExpiryDate());
        return vehicle;
    }
}
