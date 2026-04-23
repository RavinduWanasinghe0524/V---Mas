package net.javaguids.ems_backend.security;

import net.javaguids.ems_backend.entity.User;
import net.javaguids.ems_backend.enums.AccountStatus;
import net.javaguids.ems_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String userName) throws UsernameNotFoundException {
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + userName));

        // Use Spring Security's 'enabled' flag as a second-layer guard.
        // Only ACTIVE accounts are considered enabled; PENDING / INACTIVE / SUSPENDED
        // accounts will be rejected by the AuthenticationManager with DisabledException
        // before the JWT filter even runs.
        boolean isActive = AccountStatus.ACTIVE.equals(user.getAccountStatus());

        return new org.springframework.security.core.userdetails.User(
                user.getUserName(),
                user.getPassword(),
                isActive,   // enabled
                true,       // accountNonExpired
                true,       // credentialsNonExpired
                true,       // accountNonLocked
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
