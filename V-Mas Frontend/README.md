# 🚗 V-MAS — Smart Vehicle Management & Administration System

> A premium, full-featured fleet management platform designed to streamline vehicle tracking, service lifecycle management, fuel analytics, trip/job management, and user administration — all in one sleek dark-mode interface.

---

## 🌐 Live Application

### 🔗 **[👉 CLICK HERE TO LAUNCH V-MAS 👈](https://v-mas.vercel.app)**

> *(Test credentials: **admin** / **admin123**)*

---

## 🌟 Modules & Features

| Module | Icon | Description | Capabilities |
| :--- | :---: | :--- | :--- |
| **Dashboard** | 📊 | Real-time system overview | Fleet KPIs, service statuses, fuel summaries, and live health widgets |
| **Fleet Management** | 🚗 | Full vehicle registry | Register, update, search, filter, and deactivate vehicles with detailed profiles |
| **Service & Maintenance** | 🛠️ | End-to-end service tracking | Create, edit, and track service records; status flow: Pending → In Progress → Completed |
| **Fuel Management** | ⛽ | Usage logging & cost tracking | Log fill-ups, track fuel cost per vehicle, monitor consumption trends |
| **Fuel Analysis** | 📈 | Advanced efficiency analytics | km/L metrics, monthly expenditure charts, vehicle-level comparisons |
| **Fuel Log** | 📋 | Detailed fill-up history | Searchable, filterable chronological fuel log with vehicle drill-down |
| **Trips & Jobs** | 🗺️ | Job dispatch & tracking | Assign trips, log driver activity, track job progress and completion |
| **Location Tracking** | 📍 | Route visualization | Visual map of vehicle routes and registered service zones |
| **Reports** | 📄 | Data export & summaries | Generate PDF & Excel reports for fleet, service, and fuel data |
| **User Administration** | 👥 | Role & access management | Admin controls: register, edit, activate/deactivate users and drivers |
| **Profile** | 🙍 | User self-management | Update personal details, change password, manage notification preferences |

---

## ⚙️ Technology Stack

### 💻 Frontend

| Technology | Purpose |
| :--- | :--- |
| **React 19** | UI framework (component-driven SPA) |
| **Vite 8** | Lightning-fast build tool & dev server |
| **React Router DOM v7** | Client-side routing & protected routes |
| **Axios** | HTTP client for REST API communication |
| **Lucide React** | Consistent icon system |
| **jsPDF + jspdf-autotable** | In-browser PDF report generation |
| **ExcelJS** | In-browser Excel (.xlsx) export |
| **Vanilla CSS** | Custom design system (HSL palettes, glassmorphism, dark mode, animations) |

### 🏗️ Architecture Patterns

- **Code Splitting**: All pages are lazily loaded via `React.lazy()` + `Suspense` for fast initial load times
- **Context API**: `AuthProvider` (JWT session management) & `ThemeProvider` (light/dark/system theme) for global state
- **Protected Routes**: `PrivateRoute` component guards all authenticated pages; unauthenticated users are redirected to `/login`
- **Vite Proxy**: In development, `/api/*` requests are proxied to `localhost:8080` (no CORS issues)

### ⚙️ Backend & Infrastructure

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | Spring Boot (Java 17 / Corretto 17) |
| **Database** | AWS RDS (MySQL) |
| **Backend Hosting** | AWS Elastic Beanstalk (Single-Instance) |
| **Frontend Hosting** | Vercel |
| **CDN / API Gateway** | AWS CloudFront |

### 🔒 Request Flow (Production)

```
[ Browser ]  ──(HTTPS)──▶  [ Vercel (v-mas.vercel.app) ]
                                        │
                               (Server-side Proxy /api/*)
                                        ▼
                          [ AWS CloudFront Distribution ]
                                        │
                                  (HTTP forward)
                                        ▼
                   [ Spring Boot on AWS Elastic Beanstalk ]
                                        │
                               (JDBC / MySQL)
                                        ▼
                              [ AWS RDS MySQL DB ]
```

---

## 🛠️ Local Development Setup

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- A running **Spring Boot** backend at `http://localhost:8080` (or configured via `.env`)

### 1. Clone the Repository

```bash
git clone https://github.com/RavinduWanasinghe0524/V---Mas.git
cd "V---Mas/V-Mas Frontend"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` to set your API base URL:

```env
# Local development
VITE_API_BASE_URL=http://localhost:8080/api
```

> **Note:** The Vite dev server automatically proxies `/api/*` requests to `http://localhost:8080`, so you can also leave the `.env` blank for local development.

### 4. Start the Dev Server

```bash
npm run dev
```

The app will be available at **`http://localhost:3000`**.

### 5. Build for Production

```bash
npm run build
```

Output is placed in the `dist/` folder, ready for Vercel or any static host.

---

## 📁 Project Structure

```
V-Mas Frontend/
├── public/                  # Static assets
├── src/
│   ├── assets/              # Images, SVGs (e.g. V-MAS Logo.svg)
│   ├── components/          # Shared UI components
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   ├── PrivateRoute.jsx
│   │   └── TripActionModal.jsx
│   ├── context/             # Global state providers
│   │   ├── AuthContext.jsx
│   │   ├── AuthProvider.jsx  # JWT auth, login/logout, session persistence
│   │   ├── ThemeContext.jsx
│   │   └── ThemeProvider.jsx # Light / Dark / System theme toggle
│   ├── pages/               # Route-level page components (all lazy-loaded)
│   │   ├── AuthPage.jsx      # Unified login / sign-up page
│   │   ├── DashboardPage.jsx
│   │   ├── VehiclesPage.jsx
│   │   ├── ServicePage.jsx
│   │   ├── AddServicePage.jsx
│   │   ├── FuelManagementPage.jsx
│   │   ├── FuelAnalysisPage.jsx
│   │   ├── FuelLogPage.jsx
│   │   ├── TripsPage.jsx     # Jobs & dispatch
│   │   ├── LocationPage.jsx
│   │   ├── ReportsPage.jsx
│   │   ├── UsersPage.jsx
│   │   └── ProfilePage.jsx
│   ├── services/            # Axios API service layer
│   ├── utils/               # Utility helpers
│   ├── App.jsx              # Root router & Suspense wrapper
│   ├── main.jsx             # React DOM entry point
│   └── index.css            # Global design system (tokens, dark mode, animations)
├── .env.example             # Environment variable template
├── vercel.json              # Vercel routing & proxy config
├── vite.config.js           # Vite dev server & proxy settings
└── package.json
```

---

## 🌐 Production URLs

| Service | URL |
| :--- | :--- |
| **Live Web App** | [https://v-mas.vercel.app](https://v-mas.vercel.app) |
| **API Gateway (CloudFront)** | `https://d3dqxbt72t73lz.cloudfront.net` |
| **Backend (Elastic Beanstalk)** | `http://vmas-backend-env.eba-arpg3c5y.ap-southeast-1.elasticbeanstalk.com` |

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server at `localhost:3000` |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |
