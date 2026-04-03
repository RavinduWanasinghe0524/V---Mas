package net.javaguids.ems_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import net.javaguids.ems_backend.enums.FuelTypes;
import net.javaguids.ems_backend.enums.VehicleSatus;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicle_name", nullable = true, length = 150)
    private String vehicleName;

    @Column(name = "chassis_no", nullable = true, length = 150)
    private String chassisNo;

    @Column(name = "registration_no", nullable = false, unique = true, length = 50)
    private String registrationNo;

    @Column(name = "manufacturer", length = 100)
    private String manufacturer;

    @Column(name = "model", length = 100)
    private String model;

    @Column(name = "year")
    private Integer year;

    @Column(name = "current_mileage_km")
    private Integer currentMileageKm;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "driver_id", nullable = true)
    private User driver;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "status",nullable = false)
    private VehicleSatus status;

    @Column(name = "fuel_type")
    private FuelTypes fuelType;
}
