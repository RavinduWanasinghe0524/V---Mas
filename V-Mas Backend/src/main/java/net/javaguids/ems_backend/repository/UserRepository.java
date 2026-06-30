package net.javaguids.ems_backend.repository;

import net.javaguids.ems_backend.entity.User;
import net.javaguids.ems_backend.enums.AccountStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUserName(String userName);
    Optional<User> findByEmail(String email);
    Optional<User> findByUserNameOrEmail(String userName, String email);
    boolean existsByUserName(String userName);
    boolean existsByEmail(String email);
    List<User> findByAccountStatus(AccountStatus status);
}
