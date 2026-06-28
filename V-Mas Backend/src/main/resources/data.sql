-- Default seed data for V-MAS
-- Runs once on startup via spring.sql.init.mode=always
-- All passwords are BCrypt hash of: admin123

-- Default ADMIN user
INSERT INTO users (user_name, email, password, role, account_status, profile_picture)
SELECT 'admin', 'admin@vmas.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ADMIN', 'ACTIVE', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_name = 'admin' OR email = 'admin@vmas.com');

-- Default CONTROLLER user
INSERT INTO users (user_name, email, password, role, account_status, profile_picture)
SELECT 'controller1', 'controller@vmas.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'CONTROLLER', 'ACTIVE', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_name = 'controller1' OR email = 'controller@vmas.com');

-- Default DRIVER user
INSERT INTO users (user_name, email, password, role, account_status, profile_picture)
SELECT 'driver1', 'driver@vmas.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'DRIVER', 'ACTIVE', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_name = 'driver1' OR email = 'driver@vmas.com');

-- NOTE: Default user passwords are managed by the CommandLineRunner in EmsBackendApplication.java
-- which dynamically generates a BCrypt hash for 'admin123' at startup.
-- Do NOT add a static password UPDATE here as it will overwrite the dynamically-set hash.

-- Seed default service intervals for CAR
INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'CAR', 'OIL_CHANGE', 10000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'CAR' AND service_type = 'OIL_CHANGE');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'CAR', 'TIRE_ROTATION', 10000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'CAR' AND service_type = 'TIRE_ROTATION');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'CAR', 'BRAKE_SERVICE', 20000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'CAR' AND service_type = 'BRAKE_SERVICE');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'CAR', 'ENGINE_TUNE_UP', 20000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'CAR' AND service_type = 'ENGINE_TUNE_UP');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'CAR', 'TRANSMISSION_SERVICE', 40000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'CAR' AND service_type = 'TRANSMISSION_SERVICE');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'CAR', 'AC_SERVICE', 20000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'CAR' AND service_type = 'AC_SERVICE');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'CAR', 'BATTERY_REPLACEMENT', 40000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'CAR' AND service_type = 'BATTERY_REPLACEMENT');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'CAR', 'GENERAL_INSPECTION', 10000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'CAR' AND service_type = 'GENERAL_INSPECTION');

-- Seed for VAN
INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'VAN', 'OIL_CHANGE', 12000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'VAN' AND service_type = 'OIL_CHANGE');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'VAN', 'TIRE_ROTATION', 12000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'VAN' AND service_type = 'TIRE_ROTATION');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'VAN', 'BRAKE_SERVICE', 25000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'VAN' AND service_type = 'BRAKE_SERVICE');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'VAN', 'GENERAL_INSPECTION', 12000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'VAN' AND service_type = 'GENERAL_INSPECTION');

-- Seed for LORRY
INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'LORRY', 'OIL_CHANGE', 15000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'LORRY' AND service_type = 'OIL_CHANGE');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'LORRY', 'TIRE_ROTATION', 20000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'LORRY' AND service_type = 'TIRE_ROTATION');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'LORRY', 'BRAKE_SERVICE', 30000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'LORRY' AND service_type = 'BRAKE_SERVICE');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'LORRY', 'GENERAL_INSPECTION', 15000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'LORRY' AND service_type = 'GENERAL_INSPECTION');

-- Seed for BUS
INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'BUS', 'OIL_CHANGE', 15000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'BUS' AND service_type = 'OIL_CHANGE');

INSERT INTO service_intervals (vehicle_type, service_type, interval_km)
SELECT 'BUS', 'BRAKE_SERVICE', 25000 WHERE NOT EXISTS (SELECT 1 FROM service_intervals WHERE vehicle_type = 'BUS' AND service_type = 'BRAKE_SERVICE');


