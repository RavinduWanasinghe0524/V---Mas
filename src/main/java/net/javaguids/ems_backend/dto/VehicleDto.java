package net.javaguids.ems_backend.dto;

import lombok.*;
import net.javaguids.ems_backend.enums.FuelTypes;
import net.javaguids.ems_backend.enums.VehicleSatus;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VehicleDto {

    private Long id;
//    private String vehicleName;
    private String registrationNo;
    private String chassisNumber;
    private String manufacturer;
    private String model;
    private Integer year;
    private Integer currentMileageKm;
    private LocalDateTime createdAt;
    private Long driverId;
    private String driverName;
    private VehicleSatus status;
    private FuelTypes fuelType;
}
