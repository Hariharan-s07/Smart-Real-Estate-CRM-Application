# Real Estate CRM

A complete, full-stack web application built for a real estate sales team to manage leads, properties, and bookings.

## 1. Project Overview
This application serves two roles: **Admin** and **Sales Employee**.
Admins manage master property data and oversee all team activities, while Sales Employees handle day-to-day lead follow-ups and unit bookings.

## 2. Features
- **Authentication**: Secure JWT-based login with bcrypt password hashing.
- **Role-Based Access**: Specialized views and backend API constraints based on user roles.
- **Lead Management**: CRUD operations for leads, assignment to sales employees, and state tracking (Pipeline).
- **Lead Activities**: Follow-up scheduling with automatic "Overdue" status calculation.
- **Property Management**: Hierarchical management of Projects -> Buildings -> Units.
- **Bookings Flow**: End-to-end booking logic that verifies and locks unit availability before completing a transaction.
- **Dashboard**: Real-time KPIs for leads and bookings.

## 3. Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Bootstrap 5.
- **Backend**: Node.js, Express.js.
- **Database**: MySQL (accessed via `mysql2/promise`).

## 4. Architecture
The app follows a standard Monolithic REST API architecture.
- Frontend files are statically served from `/public`.
- Backend endpoints handle JSON requests under the `/api/*` prefix.
- Middleware handles authentication (`auth.js`) and role-checking (`roles.js`).

## 5. Database Overview
Relational tables include `users`, `leads`, `lead_activities`, `projects`, `buildings`, `units`, and `bookings`.
Foreign keys are strictly enforced to maintain data integrity (e.g., `ON DELETE CASCADE` for property hierarchies).

## 6. Important Decisions

Here are 5 practical decisions made during development:

1. **Double Booking Prevention via DB Row Locking**  
   *Why*: Because frontend availability checks can easily become outdated in highly concurrent environments, I relied on the database for a final check. During the booking route (`POST /api/bookings`), I use a MySQL transaction with `SELECT ... FOR UPDATE` on the unit row. This ensures only one concurrent user can read and modify the unit's status, safely preventing double bookings.

2. **Soft Duplicate Lead Warning**  
   *Why*: When saving a new lead, checking for identical emails or phone numbers acts as an excellent initial duplicate detector. I implemented a "soft warning" (via a secondary UI modal) rather than a hard block because sales employees often need flexibility (e.g., family members sharing a phone or email address but requiring separate units).

3. **Role-Based API Protection**  
   *Why*: While UI elements (like "Add Property" buttons) are hidden for sales employees, frontend restriction is not secure. I added a `requireRole(['ADMIN'])` backend middleware so that even direct API attacks to modify property master data or cancel bookings will be rejected with a `403 Forbidden` if the user is a Sales Employee.

4. **Dynamic Overdue Follow-ups**  
   *Why*: To keep the code simple, instead of running a complex background cron job, I check and update scheduled follow-ups to "Overdue" when the `GET /activities` or `GET /dashboard` endpoints are requested. This ensures the overdue state is accurate immediately upon user login or refresh.

5. **Booking Cancellation Workflow**  
   *Why*: A booking is rarely deleted; it is "Cancelled". I allowed only Admins to trigger the cancellation route. The cancellation logic intentionally updates the unit's status back to `Available` in the same transaction, ensuring that the property can immediately be booked by another lead without manual admin intervention on the property record.

## 7. Setup Instructions

1. **Prerequisites**: Ensure you have Node.js and MySQL installed.
2. **Install Dependencies**:
   ```bash
   cd real-estate-crm
   npm install
   ```
3. **Database Setup**:
   Create a database manually or use the CLI. Execute `database/schema.sql` and then `database/seed.sql` to generate the tables and dummy data.
4. **Environment Configuration**:
   Copy `.env.example` to `.env` and fill in your MySQL database credentials (username and password).
5. **Run the App**:
   ```bash
   node server/server.js
   ```
   Open your browser to `http://localhost:5000`.

## 8. Demo Credentials
All users share the dummy password: `password123`

- **Admin**: `admin@crm.com`
- **Sales 1**: `sales1@crm.com`
- **Sales 2**: `sales2@crm.com`
