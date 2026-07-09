package net.javaguids.ems_backend.repository;

import net.javaguids.ems_backend.entity.Trip;
import net.javaguids.ems_backend.enums.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findAllByOrderByCreatedAtDesc();

    List<Trip> findByDriverUsernameOrderByCreatedAtDesc(String driverUsername);

    List<Trip> findByStatusOrderByCreatedAtDesc(TripStatus status);

    List<Trip> findByDriverUsernameAndStatusInOrderByCreatedAtDesc(String driverUsername, List<TripStatus> statuses);
}
