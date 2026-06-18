package net.javaguids.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import net.javaguids.ems_backend.enums.ServiceType;
import net.javaguids.ems_backend.enums.VehicleType;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ServiceIntervalDto {
    private Long id;
    private VehicleType vehicleType;
    private ServiceType serviceType;
    private Integer intervalKm;
}
