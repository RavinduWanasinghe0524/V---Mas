# V-MAS – Vehicle Management & Authentication System

A full-stack fleet management web application with role-based access control, real-time fuel tracking, service scheduling, PDF/Excel reporting, and a dark-mode-first UI. Built with **Spring Boot 3** on the backend and **React 19 + Vite 8** on the frontend.

---

## Project Overview

**V-MAS** (Vehicle Management & Authentication System) is an enterprise-grade fleet operations and driver telemetry platform. Designed to bridge the communication gap between fleet owners, managers (controllers), and drivers, V-MAS acts as a centralized dashboard to track vehicle lifecycles, fuel consumption patterns, scheduled maintenance events, real-time-like tracking visualization, and compliance.

### Key Objectives:
- **Operational Clarity**: Role-specific dashboards presenting immediate operational summaries for Admins, Controllers, and Drivers.
- **Cost Reduction**: Analytical tracking of fuel efficiency (km/L) and maintenance expenses to highlight fleet inefficiencies.
- **Safety & Compliance**: Automatic computation of vehicle service thresholds and alerts to prevent overdue maintenance.
- **Data Portability**: Highly styled, client-side branded PDF and Excel data exports representing fleet utilization and historical trends.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Security & Authentication Architecture](#-security--authentication-architecture)
- [Database Schema & PostConstruct Migrations](#%EF%B8%8F-database-schema--postconstruct-migrations)
- [Core Algorithms & Telemetry Processing](#-core-algorithms--telemetry-processing)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Database Setup](#1-database-setup)
  - [2. Backend (Spring Boot)](#2-backend-spring-boot)
  - [3. Frontend (React + Vite)](#3-frontend-react--vite)
- [Configuration](#configuration)
- [Usage Instructions](#usage-instructions)
- [User Roles & Navigation](#user-roles--navigation)
- [Default Credentials](#default-credentials)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Testing](#testing)
- [License](#license)

---

## Features

### 🔐 Authentication & Security
- **Unified Auth Page** – Single `/login` and `/signup` route handled by `AuthPage.jsx` with animated tab switching
- **JWT Authentication** – Stateless login/logout with 24-hour token expiration
- **Account Approval Flow** – New registrations start as `PENDING`; Admin must approve before access is granted
- **Role-Based Access Control** – ADMIN, CONTROLLER, and DRIVER roles with distinct permissions enforced on both frontend routes and backend endpoints
- **Profile Management** – Update personal details and upload a profile picture

### 🚗 Vehicle Management
- Register, view, update, and delete fleet vehicles
- Track make, model, year, fuel type, registration number, current mileage, and fuel tank capacity
- Assign/unassign drivers to vehicles; view full assignment history
- Vehicle availability status tracking (`AVAILABLE`, `ASSIGNED`, `UNDER_MAINTENANCE`)
- Upload and download vehicle documents (insurance, license, etc.)
- **Live Location Tracking** – Interactive dark-themed SVG map mockup (`LocationPage.jsx`) featuring live-updating positions, real-time speed monitoring (MOVING, IDLE, PARKED), and specific vehicle details inspection cards.

### ⛽ Fuel Logging & Analytics
- **Drivers** log personal fuel fill-ups (litres, cost per litre, current mileage, date)
- **Mileage validation** – Current mileage must be ≥ the previous recorded reading; auto pre-filled from last entry with a live "km driven" indicator
- **Controllers/Admins** manage all fleet fuel logs (add, edit, soft-delete, restore)
- Automatic fuel efficiency calculation (km/L) per entry using consecutive mileage readings
- **Fuel Analysis Dashboard** – Monthly charts, per-vehicle statistics, cost trends, and efficiency ratings (Excellent / Good / Average / Poor)
- Soft-delete audit trail for deleted fuel logs

### 🔧 Service Records
- Schedule and track vehicle maintenance (oil change, tyre rotation, full service, and more)
- Service classification: Routine, Preventive, Corrective, Emergency
- Upcoming service alerts (due within the next 30 days)
- Service history per vehicle with mileage at time of service
- Upload and download service bill/receipt attachments
- Full edit audit trail per record
- Filter by vehicle, service type, or date range
- Soft-delete and restore deleted records

### 📊 Reports
- Generate and download **PDF reports** (via `jsPDF + jspdf-autotable`) covering:
  - Fleet vehicle summary
  - Fuel log history
  - Service record history
  - Total costs and efficiency statistics
- Generate and download **Excel (.xlsx) reports** (via `ExcelJS`) with:
  - Branded cover blocks, colour-coded data tables, and KPI summary rows
  - Available report types: Vehicle Summary, Fuel Consumption, Service & Maintenance, User Directory, Fuel Efficiency, Cost Analysis, Comprehensive Master Report
  - Date-range filtering for fuel and service data

### 👥 User & Employee Management
- Admin/Controller panel to create, update, activate/deactivate, and delete users
- Approve or reject pending user registrations
- Employee directory management (separate from system user accounts)
- **Role & Status filtering via Dashboard** – Stat cards on the Admin Dashboard support navigation shortcuts; clicking on Admin, Controller, Driver, Active, or Inactive cards redirects directly to the `/users` screen pre-filtered by the selected role or account status.

### 🔔 Notifications
- System-wide notifications for key events (vehicle updates, fuel log changes, service records)
- Real-time unread badge count in the Topbar
- Dismissible notification dropdown; mark individual or all notifications as read

### 🎨 UI/UX
- **Dark-mode-first** design with glassmorphism accents and a deep navy/blue palette
- Collapsible sidebar navigation (state persisted in `localStorage`) with role-aware menu items
- Auto-collapse sidebar when clicking outside; icon-only mode with tooltip labels
- Animated stat cards, hover effects, and toast notifications
- Lazy-loaded page components (via `React.lazy` + `Suspense`) with a branded loading screen
- `ThemeContext` + `AuthContext` provide consistent design tokens and auth state across the app
- **Interactive SVG Visualization Components**:
  - **Live Fleet Utilization Chart** – Pulsing area line chart with animated gradient overlays, neon glow effects, and interactive hover tooltip tracking.
  - **Status Breakdown Donut Chart** – Custom-calculated SVG donut chart representing active, maintenance, and available fleet splits with animated slice transitions and hover highlights.

---

## Tech Stack

### Backend
| Technology | Version |
|---|---|
| Java | 17+ (tested with Java 22) |
| Spring Boot | 3.5.6 |
| Spring Security + JWT (JJWT) | 0.11.5 |
| Spring Data JPA / Hibernate | – |
| Flyway (DB migrations) | – |
| MySQL / MariaDB | 8.x / 10.4+ |
| Lombok | – |
| springdoc-openapi (Swagger UI) | 2.8.6 |
| Maven | 3.6+ |

### Frontend
| Technology | Version |
|---|---|
| React | 19.x |
| Vite | 8.x |
| React Router DOM | 7.x |
| Axios | 1.x |
| Lucide React (icons) | 1.x |
| jsPDF + jspdf-autotable | 4.x / 5.x |
| ExcelJS | 3.x |

---

## Architecture Overview

```
┌──────────────────────────┐          ┌──────────────────────────┐
│  React + Vite            │  HTTP/   │  Spring Boot REST API    │
│  (port 3000 dev)         │◄────────►│  (port 8080)             │
│                          │  JSON    │                          │
│  • AuthContext           │          │  • JWT Security Filter   │
│  • ThemeContext          │          │  • REST Controllers      │
│  • React Router          │          │  • Service Layer         │
│  • Axios (api.js)        │          │  • JPA Repositories      │
│  • jsPDF + ExcelJS       │          │  • Flyway migrations     │
└──────────────────────────┘          └──────────┬───────────────┘
                                                 │ JDBC
                                      ┌──────────▼───────────────┐
                                      │  MySQL / MariaDB         │
                                      │  (vmas_db)               │
                                      └──────────────────────────┘
```

**Production topology:**
- Frontend hosted on **Vercel** (SPA rewrites via `vercel.json`)
- Backend API proxied through **AWS CloudFront** → Elastic Beanstalk
- Database on **AWS RDS MySQL** (ap-southeast-1, Singapore)

---

## 🔒 Security & Authentication Architecture

The system enforces robust JWT-based stateless authentication and authorization mechanisms across both frontend and backend layers.

### Backend Security Components (`SecurityConfig.java`)
- **JWT Authentication Filter (`JwtAuthenticationFilter.java`)**: Intercepts all incoming HTTP requests (except public auth paths and Swagger UI). It extracts the JWT token from the `Authorization: Bearer <token>` header, extracts the username, and validates it against current `UserDetails`.
- **User Activation & Soft-Delete Guard (`CustomUserDetailsService.java`)**: 
  - Prevents deleted users (checked via `user.isDeleted()`) from authenticating by throwing a `UsernameNotFoundException`.
  - Maps the account status (`AccountStatus.ACTIVE`) to Spring Security's `enabled` property. Users in `PENDING`, `INACTIVE`, or `REJECTED` states will fail database authentication attempts with a `DisabledException`.
- **Role Hierarchy & Method Security**: Uses Spring Security's `@EnableMethodSecurity` to declare fine-grained controller access.
- **REST Exception Handlers**:
  - `RestAuthenticationEntryPoint` returns custom JSON payloads for unauthenticated users (`401 Unauthorized`).
  - `RestAccessDeniedHandler` returns custom JSON payloads for unauthorized actions (`403 Forbidden`).
- **Dynamic CORS Controls**: Configures allowed origins dynamically. Out-of-the-box support includes `localhost:3000`, `localhost:5173`, LAN testing via `192.168.15.238:3000/3001` (for mobile emulator testing), and production origin `v-mas.vercel.app`. Additional endpoints can be populated at runtime via the `cors.allowed.origins` property.

### Frontend Security Mechanics (`api.js` & `AuthContext.jsx`)
- **Axios Interceptors**:
  - **Request Interceptor**: Automatically pulls the current JWT token from `localStorage` and injects it as an `Authorization` header on every outbound API call.
  - **Response Interceptor**: Intercepts global response errors. If a `401 Unauthorized` status is received on non-login/register/profile pages, it automatically wipes the token and cached user configuration from `localStorage` and triggers a hard redirect to `/login`.
- **Role Scope Restrictions**:
  - **Driver Scope**: Restricted to personal logs and views. Drivers cannot query other users, alter fleet configurations, or inspect full operational costs.
  - **Controller Scope**: Possesses general read-write privileges for vehicle scheduling and fuel logging but is explicitly constrained from modifying admin profiles or elevating other users to ADMIN. In the approval panel, controllers are restricted to view, approve, or reject DRIVER accounts only.
  - **Admin Scope**: Has unrestricted privileges to approve controllers, customize system parameters, and delete user profiles.

---

## ⚙️ Database Schema & PostConstruct Migrations

Rather than relying entirely on Spring Boot's automatic schema updates, V-MAS implements a dual-layer strategy to handle complex schema migrations safely:

1. **Idempotent Post-Initialization Schema Migrations (`SchemaMigrationConfig.java`)**:
   - Runs database modifications at startup within a `@PostConstruct` method using `JdbcTemplate`.
   - Resolves issues that Hibernate's `ddl-auto=update` cannot handle natively (such as changing constraint nullability or dropping legacy columns).
   - **Migration 1 (Service Records Stale Column)**: Identifies and removes a deprecated `vehicle_id` foreign key column from the `service_records` table, dropping key constraints dynamically first to prevent foreign key errors.
   - **Migration 2 (Fuel Log Legacy Column)**: Drops a legacy `current_mileage` column in `fuel_logs` that was orphaned by entity field name refactoring.
   - **Migration 3 (Fuel Log Nullability)**: Alters `driver_username` and `uploaded_by` column schemas to permit `NULL` values, supporting entries registered by controllers where driver associations are not mandatory.
2. **Flyway Integration**:
   - Migration scripts reside in `V-Mas Backend/src/main/resources/db/migration/` (e.g., expanding profile pictures to `LONGTEXT`, adding auditing flags).
   - Configured via standard SQL migrations for baseline adjustments, ensuring consistency across environments.

---

## 🧮 Core Algorithms & Telemetry Processing

### 1. Report Export Workbook Construction (`excelExport.js`)
Generates 7 different highly styled Excel reports (Vehicle Summary, Fuel Consumption, Service & Maintenance, User Directory, Fuel Efficiency, Cost Analysis, Comprehensive Master Report) using `ExcelJS`:
- **Theme Accents**: Defines color mappings for headers (`navy`, `indigo`, `teal`, `purple`, `gold`, `green`) and pale colors for cell styling.
- **KPI Summary Cards**: Automatically renders key metrics in standard 2-column tables before list details.
- **Auto-Fit Formula**: Loops through each column's cell values to dynamically set the appropriate width, bounded between 12 and 40 characters.
- **Formatting Utilities**: Applies custom formatting rules for currency (`Rs. 0,000`) and localization formats (`en-GB` format, e.g. `27-Jun-2026`).

### 2. Service Alert Threshold Computations (`serviceAlertUtils.js`)
Ensures vehicle safety and compliance by calculating upcoming maintenance windows:
- **Mileage Progress**: Compares current vehicle odometer readings against the last serviced and target mileages. If the remaining distance is `<= 200 km`, a `DUE_SOON` warning is triggered. Odometer values exceeding the target return `OVERDUE`.
- **Date Alerts**: Calculates dates against today's timestamp. If a scheduled date is within `7 days`, it returns `DUE_SOON`. If the date is past today, it returns `OVERDUE`.
- **Precedence Logic**: Employs a priority order (`OVERDUE` > `DUE_SOON` > `OK`) to aggregate mileage and date status flags.

### 3. Client-Side Fuel Efficiency Progression (`fuelUtils.js`)
- Groups raw fuel transactions by vehicle registration number and sorts them chronologically.
- Resolves sequential fuel efficiency via `(current mileage - previous mileage) / liters`.
- Uses the vehicle's initial database registration mileage as a baseline fallback for the very first log to ensure that efficiency calculations are available from entry #1.

### 4. Driver Telemetry & Mock Data Mocking (`driverUtils.js`)
- Generates driver telemetry such as safety ratings and travel indicators based on user database ID hash tables.
- Resolves real vehicle assignments dynamically by joining driver records against active database vehicle instances in-place.

---

## Prerequisites

- **Java 17+** (tested with Java 22)
- **Maven 3.6+** (or use the included `mvnw` / `mvnw.cmd` wrapper)
- **Node.js 18+** and **npm**
- **MySQL 8.x** or **MariaDB 10.4+** (only needed for local DB override; the backend defaults to AWS RDS)

---

## Getting Started

### 1. Database Setup

The backend connects to a **shared AWS RDS MySQL instance** by default — no local database setup is required out of the box.

> **Optional (local DB only):** If you want to run against a local MySQL/MariaDB instance, start MySQL first (XAMPP works), run the setup script, then set the environment variable overrides described in [Configuration](#configuration).
>
> ```bash
> mysql -u root < "V-Mas Backend/setup-database.sql"
> ```
>
> Optional schema patches (only needed when upgrading an existing local install):
> ```bash
> mysql -u root < "V-Mas Backend/service-migration.sql"
> mysql -u root < "V-Mas Backend/fix-database-column.sql"
> mysql -u root < "V-Mas Backend/fix-fuel-table.sql"
> mysql -u root < "V-Mas Backend/add-fuel-audit-columns.sql"
> ```

### 2. Backend (Spring Boot)

Navigate to the `V-Mas Backend` directory and run:

```bash
# Windows
cd "V-Mas Backend"
.\mvnw.cmd spring-boot:run

# macOS / Linux
cd "V-Mas Backend"
./mvnw spring-boot:run
```

The REST API will be available at **`http://localhost:8080`**.  
Swagger UI (interactive API docs): **`http://localhost:8080/swagger-ui/index.html`**

To build an executable JAR:

```bash
./mvnw clean package -DskipTests
java -jar target/vmas-backend-0.0.1-SNAPSHOT.jar
```

### 3. Frontend (React + Vite)

```bash
cd "V-Mas Frontend"

# 1. Create your local .env from the example template
copy .env.example .env    # Windows
# cp .env.example .env    # macOS / Linux

# 2. Install dependencies and start the dev server
npm install
npm run dev
```

The app will be available at **`http://localhost:3000`** (port is set to `3000` in `vite.config.js`).  
The Vite dev server proxies all `/api` requests to `http://localhost:8080`.

To build for production:

```bash
npm run build      # output written to V-Mas Frontend/dist/
npm run preview    # locally preview the production build
```

---

## Configuration

### Backend – `V-Mas Backend/src/main/resources/application.properties`

The backend is pre-configured to connect to the shared AWS RDS instance out of the box. No extra setup is needed after cloning.

```properties
# Database – defaults to AWS RDS; override with environment variables for a local DB
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:mysql://18.136.227.181:3306/vmas_db?sslMode=DISABLED&allowPublicKeyRetrieval=true&serverTimezone=UTC&connectTimeout=10000&createDatabaseIfNotExist=true}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:admin}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:Vmas2026}

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# JWT
jwt.secret=5367566B59703373367639792F423F4528482B4D6251655468576D5A71347437
jwt.expiration=86400000
```

> **Using a local database instead?** Set these environment variables before running the backend:
> ```
> SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/vmas_db?serverTimezone=UTC&createDatabaseIfNotExist=true
> SPRING_DATASOURCE_USERNAME=root
> SPRING_DATASOURCE_PASSWORD=
> ```

### Frontend – `V-Mas Frontend/.env`

The frontend reads the API base URL from a `.env` file (excluded from Git). A template is provided:

```bash
# Inside V-Mas Frontend/
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
```

Default contents of `.env` for local development:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

For production (Vercel), the `vercel.json` rewrite rule proxies `/api` to the CloudFront distribution, so no separate env var is needed in the deployed build.

---

## Usage Instructions

### 1. User Roles & Login
The application enforces role-based access control. Log in using the unified auth screen at `/login` with one of the pre-configured default credentials:
- **Admin**: Log in with username `admin` / password `admin123`. Access all views (Dashboard, Vehicles, Service Records, Users Management, Fuel Analysis, Reports).
- **Controller**: Log in with username `controller1` / password `controller123`. Access Dashboard, Vehicles, Users, Fuel Management, Service Records.
- **Driver**: Log in with username `driver1` / password `driver123`. Access Dashboard (driver stats), My Vehicle, Fuel Log (add own logs), Service History.

### 2. Live Vehicle Monitoring
- Navigate to the **Location** tab (or **Vehicles** → inspect location).
- Admins and Controllers can view the status of vehicles in real-time via the interactive SVG visualization mockup showing speed, coordinates, and details.

### 3. Fuel Logging & Validation
- **Drivers**: Add new fill-up logs under the **Fuel Log** page. The system automatically fetches the last recorded mileage. The current odometer mileage must be greater than or equal to the previous reading.
- **Controllers/Admins**: Access **Fuel Management** to oversee all fleet logs, edit incorrect entries, or restore soft-deleted records. View overall fleet metrics in **Fuel Analysis**.

### 4. Service Scheduling & Alerts
- Schedule a new maintenance record in the **Service** menu.
- The system checks mileage progress and date timelines to flag upcoming service windows as `DUE_SOON` or `OVERDUE` on the dashboard.

### 5. Report Generation
- Navigate to the **Reports** page.
- Select your target report type (e.g., Cost Analysis, Fuel Consumption, or Master Report).
- Configure date range filters if desired, then click **Download PDF** or **Export Excel**. Reports are processed client-side and saved immediately.

---

## User Roles & Navigation

| Role | Sidebar Navigation | Permissions |
|---|---|---|
| **ADMIN** | Dashboard, Vehicles, Service, Users, Fuel Analysis, Reports, My Profile | Full access – manage all users, vehicles, service records, fuel logs, notifications, and reports |
| **CONTROLLER** | Dashboard, Vehicles, Users, Fuel Management, Service, My Profile | Manage all fleet fuel logs (add / edit / soft-delete); view all vehicles and analytics |
| **DRIVER** | Dashboard, My Vehicle, Fuel Log, Service History, My Profile | Add and view own fuel logs; view assigned vehicle and service history |

> The sidebar is collapsible. When collapsed it shows icon-only navigation with hover tooltips. State is persisted to `localStorage`.

---

## Default Credentials

Created automatically by `setup-database.sql`:

| Role | Username | Password |
|---|---|---|
| ADMIN | `admin` | `admin123` |
| CONTROLLER | `controller1` | `controller123` |
| DRIVER | `driver1` | `driver123` |

> ⚠️ **Change these passwords before deploying to a production environment.**

---

## API Endpoints

> 🔐 **Authentication & Authorization Policy** — All endpoints except `/api/auth/register` and `/api/auth/login` require:
> ```
> Authorization: Bearer <your_jwt_token>
> ```
> Base URL (local): `http://localhost:8080`
>
> ### 🛡️ Controller vs. Admin Authorization Constraints:
> While both `ADMIN` and `CONTROLLER` roles have access to user management endpoints, the backend enforces the following logical constraints inside service layers and controllers:
> - **User Approval Queue (`/api/users/pending`)**: Controllers can query this queue, but the results are filtered in-memory to only reveal pending `DRIVER` accounts. Attempts by a Controller to approve or reject a pending `ADMIN` or `CONTROLLER` will throw a runtime access violation.
> - **User Modification (`/api/users/{id}`)**: Controllers cannot update `ADMIN` accounts or elevate any user's role to `ADMIN`.
> - **User Registration (`/api/users`)**: Controllers are restricted to creating only `DRIVER` or `CONTROLLER` accounts.
> - **User Deletion (`/api/users/{id}`)**: Controllers are restricted to deleting only `DRIVER` accounts.

---

### 🔑 Authentication — `/api/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/register` | Public | Register a new user (account starts as `PENDING`) |
| `POST` | `/api/auth/login` | Public | Login and receive a JWT token |
| `POST` | `/api/auth/logout` | Authenticated | Logout (clears server-side session) |

<details>
<summary>📋 Request / Response Examples</summary>

**POST /api/auth/register**
```json
// Request Body
{
  "userName": "john_driver",
  "password": "password123",
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@example.com",
  "role": "DRIVER"
}

// Response (201 Created)
{
  "success": true,
  "message": "Registration successful. Your account is pending admin approval.",
  "data": null
}
```

**POST /api/auth/login**
```json
// Request Body
{
  "userName": "admin",
  "password": "admin123"
}

// Response (200 OK)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "userName": "admin",
    "role": "ADMIN"
  }
}
```
</details>

---

### 🚗 Vehicles — `/api/vehicles`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/vehicles` | ALL | Get all vehicles |
| `POST` | `/api/vehicles` | ADMIN, CONTROLLER | Create a new vehicle |
| `GET` | `/api/vehicles/{id}` | ALL | Get vehicle by ID |
| `PUT` | `/api/vehicles/{id}` | ADMIN, CONTROLLER | Update vehicle details |
| `DELETE` | `/api/vehicles/{id}` | ADMIN, CONTROLLER | Delete a vehicle |
| `PUT` | `/api/vehicles/{id}/assign/{driverId}` | ADMIN, CONTROLLER | Assign a driver to a vehicle |
| `DELETE` | `/api/vehicles/{id}/assign` | ADMIN, CONTROLLER | Remove driver assignment |
| `POST` | `/api/vehicles/{id}/document/{docType}` | ADMIN, CONTROLLER | Upload a vehicle document |
| `GET` | `/api/vehicles/{id}/document/{docType}` | ALL | Download/view a vehicle document |

<details>
<summary>📋 Request / Response Examples</summary>

**POST /api/vehicles**
```json
// Request Body
{
  "registrationNumber": "ABC-1234",
  "make": "Toyota",
  "model": "Hilux",
  "year": 2022,
  "fuelType": "DIESEL",
  "currentMileageKm": 15000
}

// Response (201 Created)
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "id": 1,
    "registrationNumber": "ABC-1234",
    "make": "Toyota",
    "model": "Hilux",
    "status": "AVAILABLE"
  }
}
```

**PUT /api/vehicles/1/assign/3**
```json
// Response (200 OK)
{
  "success": true,
  "message": "Driver assigned successfully",
  "data": { "id": 1, "assignedDriverId": 3 }
}
```
</details>

---

### ⛽ Fuel Logs — `/api/fuel`

#### Driver Endpoints
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/fuel/add` | DRIVER | Log own fuel fill-up |
| `GET` | `/api/fuel/my-logs` | DRIVER | Get own fuel history |
| `GET` | `/api/fuel/my-logs/{id}` | DRIVER | Get one specific own log |
| `PUT` | `/api/fuel/my-logs/{id}` | DRIVER | Update own fuel log |

#### Controller / Admin Endpoints
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/fuel/all` | ADMIN, CONTROLLER | Get all fleet fuel logs |
| `POST` | `/api/fuel/controller/add` | ADMIN, CONTROLLER | Add fuel log for any vehicle |
| `PUT` | `/api/fuel/controller/{id}` | ADMIN, CONTROLLER | Update any fuel log |
| `DELETE` | `/api/fuel/controller/{id}` | ADMIN, CONTROLLER | Soft-delete a fuel log |
| `GET` | `/api/fuel/controller/search/{id}` | ADMIN, CONTROLLER | Find a fuel log by ID |
| `GET` | `/api/fuel/controller/deleted` | ADMIN, CONTROLLER | View soft-deleted logs |
| `PATCH` | `/api/fuel/controller/restore/{id}` | ADMIN, CONTROLLER | Restore a deleted log |
| `GET` | `/api/fuel/efficiency` | ADMIN, CONTROLLER | Fuel efficiency report for all vehicles |

#### Analytics Endpoints (All Roles)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/fuel/summary` | ALL | Current month fuel summary |
| `GET` | `/api/fuel/chart` | ALL | Monthly chart data |
| `GET` | `/api/fuel/stats` | ALL | Per-vehicle fuel statistics |
| `GET` | `/api/fuel/log/{id}` | ALL | Get any fuel log by ID |
| `GET` | `/api/fuel/vehicle/{regNo}` | ALL | All logs for a specific vehicle |

<details>
<summary>📋 Request / Response Examples</summary>

**POST /api/fuel/add**
```json
// Request Body
{
  "vehicleRegNumber": "ABC-1234",
  "liters": 45.5,
  "costPerLiter": 380.00,
  "currentMileageKm": 15800,
  "fuelDate": "2026-05-15"
}

// Response (201 Created)
{
  "success": true,
  "message": "Fuel log added successfully",
  "data": {
    "id": 12,
    "liters": 45.5,
    "totalCost": 17290.00,
    "efficiencyKmPerLiter": 8.2
  }
}
```

**GET /api/fuel/summary**
```json
// Response (200 OK)
{
  "success": true,
  "message": "Monthly summary retrieved successfully",
  "data": {
    "totalLiters": 320.5,
    "totalCost": 121790.00,
    "avgEfficiency": 9.1,
    "month": "2026-05"
  }
}
```
</details>

---

### 🔧 Service Records — `/api/services`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/services` | ALL | Create a service record |
| `GET` | `/api/services` | ALL | Get all service records |
| `GET` | `/api/services/{id}` | ALL | Get one service record by ID |
| `PUT` | `/api/services/{id}` | ALL | Update a service record |
| `DELETE` | `/api/services/{id}` | ADMIN, CONTROLLER | Soft-delete a service record |
| `POST` | `/api/services/filter` | ALL | Filter records by vehicle, type, or date range |
| `GET` | `/api/services/vehicle/{regNo}` | ALL | All services for a specific vehicle |
| `GET` | `/api/services/stats` | ALL | Service statistics (Driver sees own vehicle only) |
| `GET` | `/api/services/upcoming` | ALL | Services due within 30 days |
| `GET` | `/api/services/recent` | ALL | Last 5 service records |
| `POST` | `/api/services/{id}/attachment` | ALL | Upload a bill/receipt file |
| `GET` | `/api/services/{id}/attachment` | ALL | View/download the attached bill |
| `GET` | `/api/services/{id}/history` | ALL | Full edit audit trail for a record |
| `GET` | `/api/services/deleted` | ADMIN, CONTROLLER | View soft-deleted records |
| `PATCH` | `/api/services/{id}/restore` | ADMIN, CONTROLLER | Restore a deleted record |

<details>
<summary>📋 Request / Response Examples</summary>

**POST /api/services**
```json
// Request Body
{
  "vehicleRegNumber": "ABC-1234",
  "serviceType": "OIL_CHANGE",
  "serviceDate": "2026-05-10",
  "currentMileageKm": 15000,
  "serviceCost": 4500.00,
  "technicianWorkshop": "City Auto Workshop",
  "nextServiceDue": "2026-08-10",
  "nextServiceMileageKm": 20000,
  "serviceClassification": "ROUTINE",
  "description": "Engine oil and filter replaced"
}

// Response (201 Created)
{
  "success": true,
  "message": "Service record created successfully",
  "data": {
    "id": 5,
    "serviceType": "OIL_CHANGE",
    "vehicleRegNumber": "ABC-1234",
    "serviceDate": "2026-05-10"
  }
}
```

**GET /api/services/stats**
```json
// Response (200 OK)
{
  "success": true,
  "message": "Service stats fetched successfully",
  "data": {
    "totalRecords": 24,
    "completed": 18,
    "scheduled": 6,
    "totalCost": 125000.00,
    "overdueCount": 2
  }
}
```
</details>

---

### 👤 Users — `/api/users`

#### Own Profile (Any Logged-in User)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/users/me` | ALL | Get own profile |
| `PUT` | `/api/users/me` | ALL | Update own profile |
| `PUT` | `/api/users/me/password` | ALL | Change own password |

#### Admin / Controller Management
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/users` | ADMIN, CONTROLLER | Get all users |
| `POST` | `/api/users` | ADMIN, CONTROLLER | Create a new user |
| `GET` | `/api/users/{id}` | ADMIN, CONTROLLER | Get user by ID |
| `PUT` | `/api/users/{id}` | ADMIN, CONTROLLER | Update a user |
| `DELETE` | `/api/users/{id}` | ADMIN, CONTROLLER | Delete a user |
| `GET` | `/api/users/drivers` | ADMIN, CONTROLLER | Get all active drivers |
| `GET` | `/api/users/pending` | ADMIN, CONTROLLER | Get users awaiting approval |
| `PATCH` | `/api/users/{id}/approve` | ADMIN, CONTROLLER | Approve a pending user |
| `PATCH` | `/api/users/{id}/reject` | ADMIN, CONTROLLER | Reject a pending user |

---

### 🔔 Notifications — `/api/notifications`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/notifications` | ALL | Get all notifications |
| `GET` | `/api/notifications/unread` | ALL | Get only unread notifications |
| `POST` | `/api/notifications` | ALL | Create a new notification |
| `PATCH` | `/api/notifications/{id}/read` | ALL | Mark one notification as read |
| `PATCH` | `/api/notifications/read-all` | ALL | Mark all notifications as read |

---

### 🚨 Alerts — `/api/alerts`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/alerts/dashboard` | ADMIN, CONTROLLER | Service-due and document-expiry alerts for the dashboard |

<details>
<summary>📋 Response Example</summary>

**GET /api/alerts/dashboard**
```json
// Response (200 OK)
{
  "success": true,
  "message": "Dashboard alerts retrieved successfully",
  "data": {
    "serviceDueAlerts": [
      { "vehicleRegNumber": "ABC-1234", "serviceType": "OIL_CHANGE", "status": "OVERDUE" }
    ],
    "documentExpiryAlerts": [
      { "vehicleRegNumber": "XYZ-5678", "docType": "insurance", "daysUntilExpiry": 12 }
    ]
  }
}
```
</details>

---

### 👥 Employees — `/api/employees`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/employees` | ALL | Create a new employee record |
| `GET` | `/api/employees` | ALL | Get all employees |
| `GET` | `/api/employees/{id}` | ALL | Get employee by ID |
| `PUT` | `/api/employees/{id}` | ALL | Update employee record |
| `DELETE` | `/api/employees/{id}` | ALL | Delete employee record |

---

### 📦 Postman Collections

Ready-to-import collections are included in the repository:

| File | Location | Contents |
|------|----------|----------|
| `V-MAS.postman_collection.json` | Root Directory | Root-level combined API collection |
| `VMAS_Postman_Collection.json` | `V-Mas Backend/` | Auth, Vehicle, User, Employee endpoints |
| `Fuel_Analysis_Complete_Postman_Collection.json` | `V-Mas Backend/` | Full fuel management and analytics suite |
| `Service_API_Postman_Collection.json` | `V-Mas Backend/` | Service record endpoints |
| `VMAS_Local_Environment.postman_environment.json` | `V-Mas Backend/` | Pre-configured `baseUrl` and `token` variables |

**How to import:**
1. Open Postman → **Import** → select the `.json` files above
2. Set `baseUrl` = `http://localhost:8080` in the environment
3. Run **POST /api/auth/login** first and copy the token into the `token` variable
4. All other requests will use `Bearer {{token}}` automatically

---

## Project Structure

```
V---Mas/
├── V-Mas Backend/
│   ├── src/main/java/net/javaguids/ems_backend/
│   │   ├── controller/          # REST controllers (Auth, Vehicle, Fuel, Service, User, Notification, Employee, Alert)
│   │   ├── service/impl/        # Business logic implementations
│   │   ├── repository/          # Spring Data JPA repositories
│   │   ├── entity/              # JPA entities (User, Vehicle, FuelLog, ServiceRecord, Notification, Employee)
│   │   ├── dto/                 # Request / response DTOs
│   │   ├── mapper/              # Entity ↔ DTO mappers
│   │   ├── security/            # JWT filter, utilities, UserDetailsService
│   │   ├── config/              # SecurityConfig, CORS, OpenAPI config
│   │   ├── enums/               # Role, AccountStatus, ServiceType, ServiceClassification
│   │   ├── exception/           # Global exception handler
│   │   └── util/                # Utility classes
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/        # Flyway SQL migration scripts
│   ├── setup-database.sql       # Initial DB + seed data
│   ├── service-migration.sql
│   ├── fix-*.sql                # Schema patch scripts
│   ├── Dockerfile               # Multi-stage Docker build (Maven 3.9 → JRE 17 Alpine)
│   ├── VMAS_Postman_Collection.json
│   ├── Fuel_Analysis_Complete_Postman_Collection.json
│   ├── Service_API_Postman_Collection.json
│   ├── VMAS_Local_Environment.postman_environment.json
│   ├── test-fuel-api-complete.ps1   # PowerShell fuel API smoke test
│   ├── mvnw / mvnw.cmd
│   └── pom.xml
│
├── V-Mas Frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx           # Unified login + sign-up screen (tab-based)
│   │   │   ├── AuthPage.css           # Auth page styles
│   │   │   ├── DashboardPage.jsx      # Role-based dashboard (Admin / Controller / Driver)
│   │   │   ├── VehiclesPage.jsx       # Fleet vehicle management
│   │   │   ├── FuelLogPage.jsx        # Driver fuel log (with mileage validation)
│   │   │   ├── FuelManagementPage.jsx # Controller fleet fuel management
│   │   │   ├── FuelAnalysisPage.jsx   # Analytics charts and per-vehicle statistics
│   │   │   ├── ServicePage.jsx        # Service record listing and management
│   │   │   ├── AddServicePage.jsx     # Create / edit service record form
│   │   │   ├── UsersPage.jsx          # User management and approvals (Admin/Controller)
│   │   │   ├── ProfilePage.jsx        # User profile & settings
│   │   │   ├── ReportsPage.jsx        # PDF and Excel report generation
│   │   │   └── LocationPage.jsx       # Vehicle location view
│   │   ├── components/
│   │   │   ├── Sidebar.jsx            # Collapsible, role-aware navigation sidebar
│   │   │   ├── Topbar.jsx             # Header with notifications & user menu
│   │   │   ├── Navbar.jsx             # Minimal top navigation bar
│   │   │   └── PrivateRoute.jsx       # Auth guard for protected routes
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        # Auth context definition
│   │   │   ├── AuthProvider.jsx       # JWT auth state, login/logout helpers
│   │   │   ├── ThemeContext.jsx       # Theme context definition
│   │   │   └── ThemeProvider.jsx      # Dark-mode design token provider
│   │   ├── services/
│   │   │   └── api.js                 # Axios instance + all API service functions
│   │   ├── utils/
│   │   │   ├── excelExport.js         # ExcelJS branded report generator (7 report types)
│   │   │   ├── driverUtils.js         # Driver-related helper functions
│   │   │   ├── fuelUtils.js           # Fuel calculation utilities
│   │   │   └── serviceAlertUtils.js   # Service due-date alert utilities
│   │   ├── assets/
│   │   │   └── logo.png               # V-MAS brand logo
│   │   ├── App.jsx                    # Router, lazy-loaded routes, page loader
│   │   ├── App.css                    # App-level styles
│   │   ├── index.css                  # Global design system (tokens, components, animations)
│   │   └── main.jsx                   # React entry point
│   ├── public/
│   ├── .env.example                   # Environment variable template
│   ├── vercel.json                    # Vercel SPA rewrites + API proxy to CloudFront
│   ├── vite.config.js                 # Vite config (port 3000, /api proxy to :8080)
│   ├── eslint.config.js
│   └── package.json
│
├── V-MAS.postman_collection.json      # Root-level combined Postman collection
├── README.md
└── LICENSE
```

---

## Deployment

### Frontend – Vercel

The frontend is deployed on **Vercel** using the configuration in `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://d3dqxbt72t73lz.cloudfront.net/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- All `/api` calls are proxied to the backend via **AWS CloudFront**
- All other routes fall back to `index.html` for client-side routing

**To deploy:**
```bash
cd "V-Mas Frontend"
npm run build
# Push to GitHub — Vercel auto-deploys from the connected repository
```

### Backend – Docker / AWS Elastic Beanstalk

A multi-stage `Dockerfile` is included in `V-Mas Backend/`:

```bash
# Build the image
docker build -t vmas-backend "V-Mas Backend/"

# Run locally (uses AWS RDS by default)
docker run -p 8080:8080 vmas-backend

# Run with a local DB override
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://host.docker.internal:3306/vmas_db" \
  -e SPRING_DATASOURCE_USERNAME="root" \
  -e SPRING_DATASOURCE_PASSWORD="" \
  vmas-backend
```

The Docker image is tuned for low-memory environments (e.g. Render free tier):
- Base image: `eclipse-temurin:17-jre-alpine`
- JVM flags: `-Xmx300m -Xms100m -XX:+UseContainerSupport -XX:MaxRAMPercentage=60`

---

## Testing

### Postman

Import the collections from `V-Mas Backend/` into Postman:

1. **`VMAS_Postman_Collection.json`** – core auth, vehicle, user, and employee endpoints
2. **`Fuel_Analysis_Complete_Postman_Collection.json`** – full fuel analysis endpoint suite
3. **`Service_API_Postman_Collection.json`** – service record endpoints
4. **`VMAS_Local_Environment.postman_environment.json`** – pre-configured base URL and auth token variables

### PowerShell (Fuel API Smoke Test)

```powershell
cd "V-Mas Backend"
.\test-fuel-api-complete.ps1
```

### Frontend Linting

```bash
cd "V-Mas Frontend"
npm run lint
```

---

## License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

Copyright © 2026 Capstone-group-13
