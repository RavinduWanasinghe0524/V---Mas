package net.javaguids.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FuelLogDto {
    private Long id;
    private String vehicleRegNumber;
    private String fuelType;
    private Double liters;
    private Double costPerLiter;
    private Double totalCost;
    private Double mileage;
    private LocalDate date;
    private String driverUsername;

    // Audit / status fields
    private String uploadedBy;
    private Boolean isUpdated;
    private LocalDateTime updatedAt;
    private String updatedBy;
    private Boolean isDeleted;
    private LocalDateTime deletedAt;

    // Computed field for fuel efficiency (not stored in DB)
    private Double fuelEfficiency;
}
