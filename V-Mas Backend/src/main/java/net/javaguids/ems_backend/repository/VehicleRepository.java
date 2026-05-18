package net.javaguids.ems_backend.repository;

import net.javaguids.ems_backend.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    boolean existsByRegistrationNo(String registrationNo);
    Optional<Vehicle> findByRegistrationNo(String registrationNo);

    @Query(value = "select * from vehicles where driver_id in (select u.id from users u where u.user_name = :driverName)", nativeQuery = true)
    Optional<Vehicle> findByAssigneeUsername(String driverName);

    @Query(value = "select * from vehicles where driver_id = :driverId", nativeQuery = true)
    Optional<Vehicle> findByAssignee(Long driverId);

}
