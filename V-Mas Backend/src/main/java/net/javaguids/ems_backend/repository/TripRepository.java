package net.javaguids.ems_backend.repository;

import net.javaguids.ems_backend.entity.Trip;
import net.javaguids.ems_backend.enums.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findByDeletedFalseOrderByCreatedAtDesc();

    List<Trip> findByDriverUsernameAndDeletedFalseOrderByCreatedAtDesc(String driverUsername);

    List<Trip> findByStatusAndDeletedFalseOrderByCreatedAtDesc(TripStatus status);

    List<Trip> findByDriverUsernameAndStatusInAndDeletedFalseOrderByCreatedAtDesc(String driverUsername, List<TripStatus> statuses);

    List<Trip> findByDeletedTrueOrderByDeletedAtDesc();
}
