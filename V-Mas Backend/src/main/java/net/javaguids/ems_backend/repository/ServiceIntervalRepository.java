package net.javaguids.ems_backend.repository;

import net.javaguids.ems_backend.entity.ServiceInterval;
import net.javaguids.ems_backend.enums.ServiceType;
import net.javaguids.ems_backend.enums.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceIntervalRepository extends JpaRepository<ServiceInterval, Long> {
    List<ServiceInterval> findByVehicleType(VehicleType vehicleType);
    Optional<ServiceInterval> findByVehicleTypeAndServiceType(VehicleType vehicleType, ServiceType serviceType);
}
