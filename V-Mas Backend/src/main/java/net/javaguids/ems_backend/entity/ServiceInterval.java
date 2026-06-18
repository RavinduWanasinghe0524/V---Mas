package net.javaguids.ems_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import net.javaguids.ems_backend.enums.ServiceType;
import net.javaguids.ems_backend.enums.VehicleType;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "service_intervals", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"vehicle_type", "service_type"})
})
public class ServiceInterval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 50)
    private VehicleType vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false, length = 100)
    private ServiceType serviceType;

    @Column(name = "interval_km", nullable = false)
    private Integer intervalKm;
}
