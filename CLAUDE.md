# VMAS — Vehicle Management & Authentication System

## What This Project Does

VMAS is a full-stack fleet management web app. It lets drivers log fuel consumption, controllers manage vehicles and service records, and admins administer users — all with role-based access control.

**Three user roles:**
- **ADMIN** — full system access (users, vehicles, fuel, services)
- **CONTROLLER** — manage vehicles, service records, bulk fuel log operations, analytics
- **DRIVER** — log and view own fuel records only

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 17, Spring Boot 3.5.6 |
| Security | Spring Security + JWT (HS256, 24h expiry) |
| ORM | Spring Data JPA / Hibernate |
| Database | MySQL 8.x (`vmas_db`) |
| Build | Maven 3.6+ (`./mvnw`) |
| Frontend | React 19 + TypeScript, Vite (port 3000) |
| HTTP Client | Axios (with JWT interceptor) |
| Routing | React Router DOM 7 |

---

## Running the Project

### Backend
```bash
# From project root
./mvnw spring-boot:run
# Runs on http://localhost:8080
```

### Frontend
```bash
cd ems-frontend
npm install
npm run dev
# Runs on http://localhost:3000
# Vite proxies /api → http://localhost:8080
```

### Database
```bash
mysql -u root < setup-database.sql
# Creates vmas_db + seeds 3 default users
```

**Default credentials:**
- Admin: `admin` / `admin123`
- Controller: `controller1` / `controller123`
- Driver: `driver1` / `driver123`

---

## Project Structure

```
V---Mas/
├── src/main/java/net/javaguids/ems_backend/
│   ├── controller/          # REST controllers (Auth, Vehicle, Fuel, Service, User, Employee)
│   ├── entity/              # JPA entities (User, Vehicle, FuelLog, ServiceRecord, Employee, Notification)
│   ├── dto/                 # 14 DTOs (request/response shapes)
│   ├── service/impl/        # Business logic (UserServiceImpl, VehicleServiceImpl, FuelServiceImpl, ...)
│   ├── repository/          # Spring Data repos with custom JPQL queries
│   ├── security/            # JwtUtil, JwtAuthFilter, CustomUserDetailsService
│   ├── config/              # SecurityConfig (CORS, auth chain, role rules)
│   ├── enums/               # Role, AccountStatus, ServiceType
│   ├── mapper/              # Entity ↔ DTO conversion
│   ├── exception/           # GlobalExceptionHandler
│   └── util/                # ApiResponse<T> wrapper
├── src/main/resources/
│   └── application.properties
├── ems-frontend/src/
│   ├── pages/               # 17+ page components
│   ├── components/          # Navbar, Sidebar, Topbar, ProtectedRoute
│   ├── context/             # AuthContext.tsx (global auth state + localStorage)
│   ├── services/api.js      # Axios instance + API method groups
│   └── api/                 # Axios base config
├── setup-database.sql
└── pom.xml
```

---

## Database Schema (6 Tables)

**users** — auth + role + account status
**vehicles** — fleet inventory (unique registration_no)
**fuel_logs** — fuel entries per driver, with soft-delete + audit columns (`is_deleted`, `deleted_at`, `is_updated`, `updated_at`)
**service_records** — maintenance history with next-service scheduling
**employees** — employee records
**notifications** — low fuel efficiency alerts

Config: `application.properties`
```
spring.datasource.url=jdbc:mysql://localhost:3306/vmas_db
spring.jpa.hibernate.ddl-auto=update   # Hibernate auto-creates/updates tables
jwt.expiration=86400000                 # 24 hours
```

---

## API Endpoints

All responses use: `{ "success": boolean, "message": string, "data": T }`

### Auth — `/api/auth`
| Method | Path | Access |
|--------|------|--------|
| POST | `/register` | Public |
| POST | `/login` | Public |
| POST | `/logout` | Public |

### Vehicles — `/api/vehicles`
| Method | Path | Access |
|--------|------|--------|
| GET | `/` | All roles |
| POST | `/` | ADMIN/CONTROLLER |
| GET | `/{id}` | All roles |
| PUT | `/{id}` | ADMIN/CONTROLLER |
| DELETE | `/{id}` | ADMIN |

### Fuel Logs — `/api/fuel`
| Method | Path | Access |
|--------|------|--------|
| POST | `/add` | DRIVER |
| GET | `/my-logs` | DRIVER (own logs only) |
| GET | `/my-logs/{id}` | DRIVER (own) |
| PUT | `/my-logs/{id}` | DRIVER (own) |
| GET | `/all` | ADMIN/CONTROLLER |
| POST | `/controller/add` | ADMIN/CONTROLLER |
| PUT | `/controller/{id}` | ADMIN/CONTROLLER |
| DELETE | `/controller/{id}` | ADMIN/CONTROLLER (soft-delete) |
| GET | `/summary` | All roles |
| GET | `/chart` | All roles |
| GET | `/stats` | All roles |
| GET | `/vehicle/{reg}` | All roles |

### Services — `/api/services`
| Method | Path | Access |
|--------|------|--------|
| POST | `/` | ADMIN/CONTROLLER |
| GET | `/` | All roles |
| PUT | `/{id}` | ADMIN/CONTROLLER |
| DELETE | `/{id}` | ADMIN/CONTROLLER |
| POST | `/filter` | All roles |
| GET | `/stats` | All roles |
| GET | `/upcoming` | All roles (next 30 days) |
| GET | `/recent` | All roles (last 5) |

### Users — `/api/users`
| Method | Path | Access |
|--------|------|--------|
| GET | `/` | ADMIN |
| POST | `/` | ADMIN |
| GET | `/{id}` | ADMIN or self |
| PUT | `/{id}` | ADMIN or self |
| DELETE | `/{id}` | ADMIN |

### Employees — `/api/employees`
| Method | Path | Access |
|--------|------|--------|
| GET/POST/PUT/DELETE | standard CRUD | All authenticated |

---

## Key Business Logic

### Fuel Logging
1. Driver submits: vehicle reg, fuel type, liters, cost/liter, mileage, date
2. Backend auto-calculates: `totalCost = liters × costPerLiter`
3. Log is bound to authenticated driver's username
4. Fuel efficiency computed: `(currentMileage - previousMileage) / liters` km/L
5. If efficiency < 5 km/L → notification created
6. Soft-delete: sets `is_deleted=true`, `deleted_at` — data preserved

### Service Records
- `ServiceType` enum: `OIL_CHANGE, TIRE_ROTATION, BRAKE_SERVICE, ENGINE_TUNE_UP, TRANSMISSION_SERVICE, AC_SERVICE, BATTERY_REPLACEMENT, GENERAL_INSPECTION, OTHER`
- If type is `OTHER`, `serviceTypeDetail` field is required (validated in service layer)
- Upcoming services = next service due date within 30 days

### Authentication Flow
1. POST `/api/auth/login` with `{ userName, password }`
2. Spring Security validates credentials
3. JWT generated (HS256, 24h): includes username + role
4. Frontend stores token in `localStorage`
5. Axios interceptor attaches `Authorization: Bearer <token>` to all requests
6. `JwtAuthFilter` validates token on each request before controller

---

## Security Rules (SecurityConfig.java)

- CSRF: **disabled** (stateless JWT API)
- Sessions: **STATELESS**
- CORS: allowed from `localhost:3000` and `localhost:5173`
- Public routes: `/api/auth/**` only
- Everything else: requires valid JWT
- Role enforcement: `@PreAuthorize` at method level
- 401/403: custom JSON responses (not redirect)

---

## Frontend Architecture

### Auth State (`AuthContext.tsx`)
- Stores: `user` (id, userName, email, role, profilePicture, accountStatus), `token`
- Persists to `localStorage`
- Provides: `login()`, `logout()`, `isAuthenticated`, `isAdmin`

### API Client (`services/api.js`)
- Exports: `authAPI`, `userAPI`, `employeeAPI`, `vehicleAPI`, `fuelAPI`, `serviceAPI`
- 401 response → clears token + redirects to `/login`
- Auth endpoints exempt from 401 redirect

### Route Protection
- `ProtectedRoute.tsx` — requires auth; optional `adminOnly` prop
- `PrivateRoute.jsx` — legacy version

### Key Pages
- `Dashboard.tsx` — landing page post-login
- `FuelLogPage.jsx` — driver fuel entry
- `FuelManagementPage.jsx` — controller bulk management
- `FuelAnalysisPage.jsx` — charts + analytics
- `VehiclesPage.jsx` — fleet management
- `ServicePage.jsx` — service record management
- `UserList.tsx` — admin user management

---

## Error Handling

| Exception | HTTP |
|-----------|------|
| `ResourceNotFoundException` | 404 |
| `AuthenticationException` / `BadCredentialsException` | 401 |
| `AccessDeniedException` | 403 |
| `MethodArgumentNotValidException` | 400 (with field errors) |
| `RuntimeException` | 400 |
| Generic `Exception` | 500 |

---

## Testing

Postman collections are included:
- `VMAS_Postman_Collection.json` — full API suite
- `Fuel_Analysis_Complete_Postman_Collection.json` — fuel endpoints
- `VMAS_Local_Environment.postman_environment.json` — env variables
- `test-fuel-api-complete.ps1` — PowerShell test script

---

## Database Migrations

Manual SQL scripts (run in order if setting up from scratch):
1. `setup-database.sql` — initial schema + seed users
2. `service-migration.sql` — service_records table
3. `fix-database-column.sql` — schema corrections
4. `fix-fuel-table.sql` — fuel table adjustments
5. `add-fuel-audit-columns.sql` — `is_updated`, `updated_at`, `is_deleted`, `deleted_at`

---

## Adding New Features — Checklist

When adding a new entity/feature, follow this pattern:

1. **Entity** → `src/main/java/.../entity/MyEntity.java` (JPA annotations)
2. **DTO** → `src/main/java/.../dto/MyEntityDto.java`
3. **Repository** → `src/main/java/.../repository/MyEntityRepository.java`
4. **Service interface** → `src/main/java/.../service/MyEntityService.java`
5. **Service impl** → `src/main/java/.../service/impl/MyEntityServiceImpl.java`
6. **Mapper** → `src/main/java/.../mapper/MyEntityMapper.java`
7. **Controller** → `src/main/java/.../controller/MyEntityController.java`
8. **Security** → add access rules in `SecurityConfig.java` if needed
9. **Frontend API** → add methods to `ems-frontend/src/services/api.js`
10. **Frontend Page** → add to `ems-frontend/src/pages/`
11. **Route** → add in `App.tsx` with appropriate `ProtectedRoute`
12. **Sidebar** → add navigation link in `Sidebar.jsx` (role-gated if needed)
