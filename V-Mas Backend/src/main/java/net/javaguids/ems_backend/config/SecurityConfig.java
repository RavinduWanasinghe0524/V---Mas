package net.javaguids.ems_backend.config;

import net.javaguids.ems_backend.security.JwtAuthenticationFilter;
import net.javaguids.ems_backend.security.RestAccessDeniedHandler;
import net.javaguids.ems_backend.security.RestAuthenticationEntryPoint;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthFilter;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private RestAuthenticationEntryPoint restAuthenticationEntryPoint;

    @Autowired
    private RestAccessDeniedHandler restAccessDeniedHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        // ── Public ──────────────────────────────────────────────
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // ── Service records — CRUD for ADMIN/CONTROLLER, read for DRIVER ──
                        .requestMatchers(org.springframework.http.HttpMethod.GET,
                                "/api/services", "/api/services/**").hasAnyRole("ADMIN", "CONTROLLER", "DRIVER")
                        .requestMatchers(org.springframework.http.HttpMethod.POST,
                                "/api/services").hasAnyRole("ADMIN", "CONTROLLER", "DRIVER")
                        .requestMatchers(org.springframework.http.HttpMethod.POST,
                                "/api/services/filter").hasAnyRole("ADMIN", "CONTROLLER")
                        .requestMatchers(org.springframework.http.HttpMethod.PUT,
                                "/api/services/**").hasAnyRole("ADMIN", "CONTROLLER", "DRIVER")
                        .requestMatchers(org.springframework.http.HttpMethod.DELETE,
                                "/api/services/**").hasAnyRole("ADMIN", "CONTROLLER")

                        // ── Fuel ────────────────────────────────────────────────
                        .requestMatchers("/api/fuel/**").authenticated()

                        // ── Vehicles ─────────────────────────────────────────────
                        .requestMatchers("/api/vehicles/**").authenticated()

                        // ── Users / admin ────────────────────────────────────────
                        // Allow all authenticated users to access their own profile
                        .requestMatchers("/api/users/me", "/api/users/me/**").authenticated()
                        // Restrict other user management to ADMIN/CONTROLLER
                        .requestMatchers("/api/users/**").hasAnyRole("ADMIN", "CONTROLLER")

                        // ── Everything else requires login ───────────────────────
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(restAuthenticationEntryPoint)
                        .accessDeniedHandler(restAccessDeniedHandler))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Extra origins can be added via the CORS_ALLOWED_ORIGINS env var (comma-separated)
    @Value("${cors.allowed.origins:}")
    private String extraAllowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        List<String> allowedOrigins = new ArrayList<>(Arrays.asList(
                "http://localhost:3000",
                "http://localhost:5173",
                "http://192.168.15.238:3000",  // Mobile device access via LAN
                "http://192.168.15.238:3001",  // Fallback port
                "https://v-mas.vercel.app"      // Vercel production frontend
        ));

        // Add any extra origins from environment variable (e.g. custom Vercel preview URLs)
        if (extraAllowedOrigins != null && !extraAllowedOrigins.isBlank()) {
            Arrays.stream(extraAllowedOrigins.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .forEach(allowedOrigins::add);
        }

        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
