# V-MAS: Smart Vehicle Service Management System

V-MAS (Vehicle Management and Service System) is a modern, responsive, and feature-rich fleet management platform designed to streamline vehicle tracking, maintenance services, fuel analytics, and user administration.

---

## 🚀 Key Features

*   **📊 Interactive Dashboard:** Overview of fleet metrics, service statuses, fuel logs, and system health widgets.
*   **🚗 Fleet Management:** Register, update, and manage vehicle details including model, status, license numbers, and assignments.
*   **🛠️ Service & Maintenance:** Track servicing records, schedule maintenance events, and monitor status updates (Pending, In Progress, Completed).
*   **⛽ Fuel Management & Analysis:** Log fuel consumption, analyze fuel efficiency (km/L metrics), and track monthly expenditures.
*   **📍 Location Tracking:** Real-time visual tracking of vehicles across registered service routes.
*   **👥 User Management:** Admin dashboard to view, register, edit, and control system access permissions for users and drivers.
*   **📈 Reports:** Generate historical data summaries, export logs, and compile fleet-wide analytics.

---

## 🛠️ Technology Stack

### Frontend
*   **Framework:** React (Vite-powered, eagerly & lazily code-split components)
*   **Language:** JavaScript (JSX)
*   **Routing:** React Router v6
*   **Styling:** Custom Modern Vanilla CSS (tailored HSL colors, sleek dark mode, glassmorphism, responsive grid layouts)
*   **Hosting:** [Vercel](https://v-mas.vercel.app)

### Backend
*   **Framework:** Spring Boot (Java)
*   **Database:** AWS RDS (MySQL)
*   **Deployment:** AWS Elastic Beanstalk (Corretto 17)

### Infrastructure & Proxy Chain
To ensure secure HTTPS communication and avoid CORS issues, requests follow this proxy architecture:

```
[ Browser / Client ]  ---(HTTPS)--->  [ Vercel (v-mas.vercel.app) ]
                                                   |
                                            (Server-side Proxy)
                                                   v
[ Spring Boot Backend ] <---(HTTP)--- [ AWS CloudFront (d3dqxbt72t73lz) ]
          |
     (JDBC Connection)
          v
[ AWS RDS MySQL Database ]
```

---

## ⚙️ Project Setup & Configuration

### Prerequisites
*   **Node.js:** v18 or later
*   **npm:** v9 or later

### Local Development

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/RavinduWanasinghe0524/V---Mas.git
    cd V---Mas/V-Mas Frontend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Run the Local Development Server:**
    ```bash
    npm run dev
    ```
    *The app will be accessible at `http://localhost:5173`.*

4.  **Local API Configuration:**
    The React application uses path-based routing (`/api/*`). In local development, the development server proxies api requests to the backend. In production, Vercel routes `/api/*` requests to the CloudFront domain via [vercel.json](vercel.json).

---

## 🌐 Production URL Configuration
*   **Frontend Site:** [https://v-mas.vercel.app](https://v-mas.vercel.app)
*   **Production API Origin (CloudFront):** `https://d3dqxbt72t73lz.cloudfront.net`
*   **Elastic Beanstalk Backend Instance:** `http://vmas-backend-env.eba-arpg3c5y.ap-southeast-1.elasticbeanstalk.com`
