package net.javaguids.ems_backend.dto;

import lombok.*;
import net.javaguids.ems_backend.enums.FuelTypes;
import net.javaguids.ems_backend.enums.VehicleSatus;
import net.javaguids.ems_backend.enums.VehicleType;

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
    private String engineNumber;
    private String manufacturer;
    private String model;
    private Integer year;
    private Integer currentMileageKm;
    private Integer initialMileageKm;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String updatedBy;

    private VehicleSatus status;
    private FuelTypes fuelType;
    private VehicleType vehicleType;

    private java.time.LocalDate insuranceExpiryDate;
    private java.time.LocalDate licenseExpiryDate;


    private String insuranceDocumentPath;
    private String licenseDocumentPath;
    private String registrationBookPath;
    private String vehicleImage;

    private boolean deleted;
    private String deletedBy;
    private java.time.LocalDateTime deletedAt;
}
